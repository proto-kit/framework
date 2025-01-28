import { injectable } from "tsyringe";
import {
  ContractModule,
  SmartContractClassFromInterface,
} from "@proto-kit/protocol";
import { FungibleTokenAdmin } from "mina-fungible-token";
import { CompileArtifact } from "@proto-kit/common";

@injectable()
export class FungibleTokenAdminContractModule extends ContractModule<FungibleTokenAdmin> {
  public contractFactory(): SmartContractClassFromInterface<FungibleTokenAdmin> {
    return FungibleTokenAdmin;
  }

  public async compile(): Promise<Record<string, CompileArtifact>> {
    const vk = await FungibleTokenAdmin.compile();
    return {
      FungibleTokenAdmin: vk,
    };
  }
}
