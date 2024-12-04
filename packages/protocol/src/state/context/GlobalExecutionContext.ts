import { singleton } from "tsyringe";
import { Mutex } from "async-mutex";

@singleton()
export default class GlobalExecutionContext {
  private mutex = new Mutex();

  public get mutexInstance() {
    return this.mutex;
  }
}
