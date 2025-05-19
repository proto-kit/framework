import { implement } from "@proto-kit/common";

export interface StartableModule {
  start(): Promise<void>;
}

export function startable() {
  return implement<StartableModule>("Startable");
}
