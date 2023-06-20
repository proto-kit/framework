import { inject, injectable } from "tsyringe";

import { StateService } from "./InMemoryStateService";

@injectable()
export class StateServiceProvider {
  private readonly defaultStateService: StateService = this.currentStateService;

  public constructor(
    @inject("StateService") private currentStateService: StateService
  ) {}

  public get stateService(): StateService {
    return this.currentStateService;
  }

  public setCurrentStateService(service: StateService) {
    this.currentStateService = service;
  }

  public resetToDefault() {
    this.currentStateService = this.defaultStateService;
  }
}
