import { Permissions } from "o1js";

export interface BaseLayerContractPermissions {
  settlementContract(): Permissions;
  dispatchContract(): Permissions;
}
