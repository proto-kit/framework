import { Permissions } from "o1js";

import { BaseLayerContractPermissions } from "./BaseLayerContractPermissions";

export class SignedSettlementPermissions
  implements BaseLayerContractPermissions
{
  private onlySignature() {
    return {
      ...Permissions.default(),
      editState: Permissions.signature(),
      send: Permissions.signature(),
      editActionState: Permissions.signature(),
      // set access permission, to prevent unauthorized token operations
      access: Permissions.proofOrSignature(),
    };
  }

  public dispatchContract(): Permissions {
    return this.onlySignature();
  }

  public settlementContract(): Permissions {
    return this.onlySignature();
  }
}
