import { Readable } from "stream";
import { finished } from "node:stream/promises";

import * as Minio from "minio";
import { RemoteCache } from "@proto-kit/common";
import { SequencerModule, sequencerModule } from "@proto-kit/sequencer";

export type S3Config = {
  client: Minio.ClientOptions;
  bucketName: string;
};

const PREFIX_DELIMITER = "/";

@sequencerModule()
export class S3RemoteCache
  extends SequencerModule<S3Config>
  implements RemoteCache
{
  client?: Minio.Client;

  private getObjectName(program: string, object: string): string {
    return `${program}${PREFIX_DELIMITER}${object}`;
  }

  private assertValidObjectName(name: string) {
    if (name.includes("/")) {
      throw new Error("Object name can't contain slashes (/)");
    }
  }

  private async ensureBucketExists() {
    const bucketExists = await this.client!.bucketExists(
      this.config.bucketName
    );

    if (!bucketExists) {
      await this.client!.makeBucket(this.config.bucketName);
    }
  }

  public async storeObject(
    program: string,
    object: string,
    file: Readable
  ): Promise<void> {
    this.assertValidObjectName(object);
    this.assertValidObjectName(program);

    await this.client!.putObject(
      this.config.bucketName,
      this.getObjectName(program, object),
      file,
      undefined,
      {}
    );
  }

  public async getObjects(program: string): Promise<string[]> {
    this.assertValidObjectName(program);

    const stream = this.client!.listObjectsV2(
      this.config.bucketName,
      program + PREFIX_DELIMITER
    );

    const results: Minio.BucketItem[] = [];
    stream.on("data", (data) => {
      results.push(data);
    });

    await finished(stream);

    return results.map((result) => result.name!.split("/")[1]);
  }

  public async readObject(program: string, object: string): Promise<Readable> {
    this.assertValidObjectName(object);
    this.assertValidObjectName(program);

    return await this.client!.getObject(
      this.config.bucketName,
      this.getObjectName(program, object)
    );
  }

  async start(): Promise<void> {
    this.client = new Minio.Client(this.config.client);

    await this.ensureBucketExists();
  }
}
