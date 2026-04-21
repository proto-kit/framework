import { implement, Startable } from "@proto-kit/common";

export function instrumentation() {
  return implement<PollInstrumentation | PushInstrumentation>(
    "Instrumentation"
  );
}

export interface InstrumentationModule {
  name: string;

  description?: string;
}

export interface PollInstrumentation extends InstrumentationModule {
  poll(): Promise<number>;
}

export abstract class PushInstrumentation implements Startable {
  abstract names: string[];

  abstract description?: string;

  private pushFn?: (name: string, value: number) => void;

  public setPushFn(f: (name: string, value: number) => void) {
    this.pushFn = f;
  }

  protected pushValue(name: string, value: number) {
    if (this.pushFn === undefined) {
      throw new Error("Pushfn not initialized");
    }
    if (!this.names.includes(name)) {
      throw new Error(`Name ${name} not specified in declared name list`);
    }
    this.pushFn(name, value);
  }

  abstract start(): Promise<void>;
}
