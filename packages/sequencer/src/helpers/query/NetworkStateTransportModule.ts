import { NetworkState } from "@proto-kit/protocol";

export interface NetworkStateTransportModule {
  getUnprovenNetworkState: () => Promise<NetworkState>;
  getStagedNetworkState: () => Promise<NetworkState>;
  getProvenNetworkState: () => Promise<NetworkState>;
}
