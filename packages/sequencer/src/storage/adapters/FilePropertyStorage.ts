import fs from "node:fs";

import { PropertyStorage } from "../repositories/PropertyStorage";

const FILE_NAME = "db.json";

export class FilePropertyStorage implements PropertyStorage {
  json: Record<string, string> | undefined = undefined;

  private readFile(): Promise<Record<string, string>> {
    return new Promise((accept) => {
      fs.readFile(FILE_NAME, (err, buffer) => {
        if (err === null) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          accept(JSON.parse(buffer.toString()));
        } else {
          accept({});
        }
      });
    });
  }

  private writeFile(content: Record<string, string>): Promise<boolean> {
    const encoded = JSON.stringify(content);
    return new Promise((accept, reject) => {
      fs.writeFile(FILE_NAME, encoded, (err) => {
        if (err === null) {
          accept(true);
        } else {
          reject(err);
        }
      });
    });
  }

  public async get(key: string): Promise<string | undefined> {
    if (this.json === undefined) {
      this.json = await this.readFile();
    }
    return this.json[key];
  }

  public async set(key: string, value: string): Promise<void> {
    if (this.json === undefined) {
      this.json = await this.readFile();
    }
    this.json[key] = value;
    await this.writeFile(this.json);
  }
}
