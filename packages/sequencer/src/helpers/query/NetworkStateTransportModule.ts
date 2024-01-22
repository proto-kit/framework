import { NetworkState } from "@proto-kit/protocol";

export interface NetworkStateTransportModule {
  getUnprovenNetworkState: () => Promise<NetworkState | undefined>;
  getStagedNetworkState: () => Promise<NetworkState | undefined>;
  getProvenNetworkState: () => Promise<NetworkState | undefined>;
}
