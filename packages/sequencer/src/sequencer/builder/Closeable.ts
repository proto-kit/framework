import { implement } from "@proto-kit/common";

export interface Closeable {
  close: () => Promise<void>;
}

export function closeable() {
  return implement<Closeable>("Closeable");
}
