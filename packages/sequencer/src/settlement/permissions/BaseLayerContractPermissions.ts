import { Permissions } from "o1js";

export interface BaseLayerContractPermissions {
  settlementContract(): Permissions;
  dispatchContract(): Permissions;
  bridgeContractMina(): Permissions;
  // TODO Not used at the moment, but probably the permissions have to be different
  //  depending on whether the bridge is on a custom token or not
  bridgeContractToken(): Permissions;
}
