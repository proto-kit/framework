import { Permissions, TransactionVersion } from "o1js";

import { BaseLayerContractPermissions } from "./BaseLayerContractPermissions";

export class ProvenSettlementPermissions
  implements BaseLayerContractPermissions
{
  private onlyProofs(): Permissions {
    return {
      ...Permissions.default(),
      // set access permission, to prevent unauthorized token operations
      // access: Permissions.proofOrSignature(),
      // TODO We need to figure out how to correctly instantiate the permissions for access
      // Since this makes receive: none permissions impossible. Probably a seperate
      // token holder contract makes sense
      access: Permissions.none(),
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

  public bridgeContractMina(): Permissions {
    return this.onlyProofs();
  }

  public bridgeContractToken(): Permissions {
    return this.onlyProofs();
  }
}
