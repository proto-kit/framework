import { inject, injectable } from "tsyringe";

import { StateService } from "./StateService";

const errors = {
  stateServiceNotSet: () =>
    new Error(
      `StateService has not been set yet. Be sure to either call your runtime or 
      protocol function by creating them with an AppChain or by setting the 
      stateService manually.`
    ),
};

@injectable()
export class StateServiceProvider {
  private readonly defaultStateService?: StateService =
    this.currentStateService;

  public constructor(
    @inject("StateService") private currentStateService?: StateService
  ) {}

  public get stateService(): StateService {
    if (this.currentStateService === undefined) {
      throw errors.stateServiceNotSet();
    }
    return this.currentStateService;
  }

  public setCurrentStateService(service: StateService) {
    this.currentStateService = service;
  }

  public resetToDefault() {
    this.currentStateService = this.defaultStateService;
  }
}
