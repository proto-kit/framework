import { Readable } from "node:stream";

export interface RemoteCache {
  storeObject(program: string, object: string, file: Readable): Promise<void>;

  getObjects(program: string): Promise<string[]>;

  readObject(program: string, object: string): Promise<Readable>;
}
