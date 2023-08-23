import { injectable, Lifecycle, scoped } from "tsyringe";

import { StateTransitionWitnessProvider } from "./StateTransitionWitnessProvider";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class StateTransitionWitnessProviderReference {
  private witnessProvider?: StateTransitionWitnessProvider;

  public setWitnessProvider(provider: StateTransitionWitnessProvider) {
    this.witnessProvider = provider;
  }

  public getWitnessProvider(): StateTransitionWitnessProvider | undefined {
    return this.witnessProvider;
  }
}
