import { Closeable } from "../sequencer/builder/Closeable";

export interface Database extends Closeable {
  executeInTransaction(f: () => Promise<void>): Promise<void>;
}
