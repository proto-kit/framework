import { implement } from "@proto-kit/common/dist/config/injectAlias";

export interface Closeable {
  close: () => Promise<void>;
}

export function closeable() {
  return implement<Closeable>("Closeable");
}
