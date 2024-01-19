import { NetworkState } from "@proto-kit/protocol";

import { NetworkStateTransportModule } from "./NetworkStateTransportModule";

export class NetworkStateQuery {
  public constructor(
    private readonly transportModule: NetworkStateTransportModule
  ) {}

  public get unproven(): Promise<NetworkState | undefined> {
    return this.transportModule.getUnprovenNetworkState();
  }

  public get stagedUnproven(): Promise<NetworkState | undefined> {
    return this.transportModule.getStagedNetworkState();
  }

  public get proven(): Promise<NetworkState | undefined> {
    return this.transportModule.getProvenNetworkState();
  }
}
