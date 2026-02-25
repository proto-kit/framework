import { injectable } from "tsyringe";
import {
  ContractModule,
  SmartContractClassFromInterface,
} from "@proto-kit/protocol";
import { CompileArtifact, CompileRegistry } from "@proto-kit/common";
import { FungibleToken } from "fungible-token-contract";

@injectable()
export class FungibleTokenContractModule extends ContractModule<FungibleToken> {
  public contractFactory(): SmartContractClassFromInterface<FungibleToken> {
    return FungibleToken;
  }

  public async compile(
    registry: CompileRegistry
  ): Promise<Record<string, CompileArtifact>> {
    const vk = await registry.proverNeeded(
      async (reg) => await reg.compile(FungibleToken)
    );
    return {
      FungibleToken: vk,
    };
  }
}
