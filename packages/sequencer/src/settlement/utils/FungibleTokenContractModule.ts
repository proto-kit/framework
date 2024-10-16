import { injectable } from "tsyringe";
import {
  ContractModule,
  SmartContractClassFromInterface,
} from "@proto-kit/protocol";
import { FungibleToken } from "mina-fungible-token";
import { CompileArtifact } from "@proto-kit/common";

@injectable()
export class FungibleTokenContractModule extends ContractModule<FungibleToken> {
  public contractFactory(): SmartContractClassFromInterface<FungibleToken> {
    return FungibleToken;
  }

  public async compile(): Promise<Record<string, CompileArtifact>> {
    const vk = await FungibleToken.compile();
    return {
      FungibleToken: vk,
    };
  }
}
