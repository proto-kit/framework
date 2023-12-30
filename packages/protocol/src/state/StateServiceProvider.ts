import { inject, injectable } from "tsyringe";

import { StateService } from "./StateService";
import { log } from "@proto-kit/common";

const errors = {
  stateServiceNotSet: () =>
    new Error(
      "StateService has not been set yet. Be sure to either call your runtime or protocol function by creating them with an AppChain or by setting the stateService manually."
    ),
};

@injectable()
export class StateServiceProvider {
  private readonly stateServiceStack: StateService[] = [];

  public get stateService(): StateService {
    if (this.stateServiceStack.length === 0) {
      throw errors.stateServiceNotSet();
    }

    // Assertion here is ok, because we check that the array is not empty above
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.stateServiceStack.at(-1)!;
  }

  public setCurrentStateService(service: StateService) {
    this.stateServiceStack.push(service);
  }

  public popCurrentStateService() {
    if (this.stateServiceStack.length === 0) {
      log.trace("Trying to pop from empty state-service stack");
      return;
    }
    this.stateServiceStack.pop();
  }
}
