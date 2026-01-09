import { NetworkStateJson } from "@proto-kit/protocol";

import { NetworkStateTransportModule } from "./NetworkStateTransportModule";

export class NetworkStateQuery {
  public constructor(
    private readonly transportModule: NetworkStateTransportModule
  ) {}

  public get unproven(): Promise<NetworkStateJson | undefined> {
    return this.transportModule.getUnprovenNetworkState();
  }

  public get stagedUnproven(): Promise<NetworkStateJson | undefined> {
    return this.transportModule.getStagedNetworkState();
  }

  public get proven(): Promise<NetworkStateJson | undefined> {
    return this.transportModule.getProvenNetworkState();
  }
}
