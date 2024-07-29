import { Permissions, TransactionVersion } from "o1js";

import { BaseLayerContractPermissions } from "./BaseLayerContractPermissions";

export class ProvenSettlementPermissions
  implements BaseLayerContractPermissions
{
  private onlyProofs(): Permissions {
    return {
      ...Permissions.default(),
      // set access permission, to prevent unauthorized token operations
      access: Permissions.proofOrSignature(),
      // The following only makes sense if the chain has a way to self-upgrade
      setPermissions: Permissions.proof(),
      setVerificationKey: {
        auth: Permissions.proof(),
        txnVersion: TransactionVersion.current(),
      },
      setDelegate: Permissions.proof(),
    };
  }

  public settlementContract(): Permissions {
    return this.onlyProofs();
  }

  public dispatchContract(): Permissions {
    return this.onlyProofs();
  }
}
