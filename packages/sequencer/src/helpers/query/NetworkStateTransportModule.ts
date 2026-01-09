import { NetworkStateJson } from "@proto-kit/protocol";

export interface NetworkStateTransportModule {
  getUnprovenNetworkState: () => Promise<NetworkStateJson | undefined>;
  getStagedNetworkState: () => Promise<NetworkStateJson | undefined>;
  getProvenNetworkState: () => Promise<NetworkStateJson | undefined>;
}
