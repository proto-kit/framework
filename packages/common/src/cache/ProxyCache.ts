import { CacheHeader, Cache as O1Cache } from "o1js";

export class ProxyCache implements O1Cache {
  private realCache = O1Cache.FileSystemDefault;

  private log: string[] = [];

  canWrite = true;

  debug = false;

  public read(header: CacheHeader): Uint8Array | undefined {
    return this.realCache.read(header);
  }

  public write(header: CacheHeader, value: Uint8Array): void {
    this.log.push(header.persistentId);
    return this.realCache.write(header, value);
  }

  public getLog() {
    return this.log;
  }

  public startLog() {
    this.log = [];
  }
}
