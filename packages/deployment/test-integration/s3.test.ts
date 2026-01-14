import Minio from "minio";
import { Field, ZkProgram } from "o1js";
import { CacheManifest, log, RemoteCacheCompiler } from "@proto-kit/common";
import { S3RemoteCache } from "../src/cache/S3RemoteCache";

const program = ZkProgram({
  name: "cache-test-zkprogram",
  publicInput: Field,
  publicOutput: Field,
  methods: {
    increment: {
      privateInputs: [],
      async method(input: Field) {
        return { publicOutput: input.add(1).add(input) };
      },
    },
  },
});

describe("s3", () => {
  const config: Minio.ClientOptions = {
    endPoint: "localhost",
    port: 9000,
    useSSL: false,
    accessKey: "minioadmin",
    secretKey: "minioadmin",
  };

  // function clearCache() {
  //   fs.rmSync(cachedir("o1js"), { force: true, recursive: true });
  //   fs.mkdirSync(cachedir("o1js"));
  // }

  beforeAll(() => {
    // clearCache();

    log.setLevel("DEBUG");
  });

  it("should upload artifacts on first compile", async () => {
    const cache = new S3RemoteCache();
    cache.config = {
      client: config,
      bucketName: "cache-test-bucket",
    };
    await cache.start();

    const compiler = new RemoteCacheCompiler(cache, new CacheManifest());

    await compiler.compileWithCache(program);

    const srsObjects = await cache.getObjects("srs");
    expect(srsObjects.length).toBe(6);

    const programObjects = await cache.getObjects("cache-test-zkprogram");
    expect(programObjects.length).toBe(8);
  }, 100000);

  // Not a lot else we can test this way, since o1js keeps the prover, therefore recompiling
  // doesn't do anything regarding the cache...
});
