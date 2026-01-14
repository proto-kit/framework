import fs from "node:fs";
import path from "node:path";

import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import cachedir from "cachedir";

import { log } from "../log";
import { mapSequential } from "../utils";
import {
  CompileArtifact,
  PlainZkProgram,
} from "../zkProgrammable/ZkProgrammable";

import { RemoteCache } from "./RemoteCache";
import { ProxyCache } from "./ProxyCache";
import { CacheManifest } from "./CacheManifest";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class RemoteCacheCompiler {
  public constructor(
    @inject("RemoteCache", { isOptional: true })
    private readonly remoteCache: RemoteCache | undefined,
    private readonly manifest: CacheManifest
  ) {
    if (remoteCache === undefined) {
      log.debug(
        "No remote cache configured, only using local file system cache for circuits"
      );
    } else {
      log.debug("Using remote cache for circuit caching");
    }
  }

  private getFileFromObjectName(object: string): string {
    const dir = cachedir("o1js");

    return path.format({
      dir,
      base: object,
    });
  }

  private async download(remoteCache: RemoteCache, name: string) {
    const objects = await remoteCache.getObjects(name);

    log.debug(`Downloading ${objects.length} cached objects for ${name}`);

    await mapSequential(objects, async (object) => {
      const readable = await remoteCache.readObject(name, object);
      const file = this.getFileFromObjectName(object);

      const writeStream = fs.createWriteStream(file);
      readable.pipe(writeStream);

      await new Promise<void>((res) => {
        writeStream.on("close", res);
      });
    });
  }

  private async uploadFile(
    remoteCache: RemoteCache,
    program: string,
    fileName: string
  ) {
    const file = path.resolve(cachedir("o1js"), fileName);
    const readStream = fs.createReadStream(file);
    await remoteCache.storeObject(program, fileName, readStream);
  }

  private async upload(
    remoteCache: RemoteCache,
    name: string,
    identifiers: string[]
  ) {
    await mapSequential(identifiers, async (identifier) => {
      await this.uploadFile(remoteCache, name, identifier);
      await this.uploadFile(remoteCache, name, `${identifier}.header`);
    });
  }

  private isSRSFile(file: string): boolean {
    return file.includes("srs-") || file.includes("lagrange-");
  }

  private async compileWithRemoteCache(
    remoteCache: RemoteCache,
    program: Pick<PlainZkProgram, "name" | "compile">
  ) {
    const { name } = program;

    if (!this.manifest.includes("srs")) {
      await this.download(remoteCache, "srs");
    }

    if (!this.manifest.includes(name)) {
      await this.download(remoteCache, name);
    }

    const cache = new ProxyCache();
    cache.startLog();

    const result = await program.compile({
      cache,
    });

    const files = cache.getLog();
    log.debug("Uploading files", files);

    const srsFiles = files.filter((file) => this.isSRSFile(file));
    await this.upload(remoteCache, "srs", srsFiles);
    this.manifest.writeToManifest("srs");

    const circuitFiles = files.filter((file) => !this.isSRSFile(file));
    await this.upload(remoteCache, name, circuitFiles);
    this.manifest.writeToManifest(name);

    return result;
  }

  public async compileWithCache(
    program: Pick<PlainZkProgram, "name" | "compile">
  ): Promise<CompileArtifact> {
    if (this.remoteCache !== undefined) {
      return await this.compileWithRemoteCache(this.remoteCache, program);
    } else {
      return await program.compile();
    }
  }
}
