import path from "node:path";
import fs from "node:fs";

import { injectable, singleton } from "tsyringe";
import cachedir from "cachedir";

@injectable()
@singleton()
export class CacheManifest {
  public manifestFile(): string {
    return path.format({
      dir: cachedir("o1js"),
      name: "protokit-cache-manifest",
      ext: "json",
    });
  }

  manifestRead = false;

  manifest: string[] = [];

  private readManifest(): string[] {
    const file = this.manifestFile();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file).toString());
    }
    return [];
  }

  private ensureManifestRead() {
    if (!this.manifestRead) {
      this.manifest = this.readManifest();
      this.manifestRead = true;
    }
  }

  public getManifest() {
    this.ensureManifestRead();

    return this.manifest;
  }

  public writeToManifest(program: string) {
    this.ensureManifestRead();

    if (!this.manifest.includes(program)) {
      this.manifest.push(program);
      fs.writeFileSync(this.manifestFile(), JSON.stringify(this.manifest));
    }
  }

  public includes(program: string): boolean {
    this.ensureManifestRead();

    return this.manifest.includes(program);
  }
}
