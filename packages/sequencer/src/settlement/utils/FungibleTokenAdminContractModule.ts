import { injectable } from "tsyringe";
import {
  ContractModule,
  SmartContractClassFromInterface,
} from "@proto-kit/protocol";
import { FungibleTokenAdmin } from "mina-fungible-token";
import { CompileArtifact, CompileRegistry } from "@proto-kit/common";

@injectable()
export class FungibleTokenAdminContractModule extends ContractModule<FungibleTokenAdmin> {
  public contractFactory(): SmartContractClassFromInterface<FungibleTokenAdmin> {
    return FungibleTokenAdmin;
  }

  public async compile(
    registry: CompileRegistry
  ): Promise<Record<string, CompileArtifact>> {
    const vk = await registry.proverNeeded(
      async (reg) => await reg.compile(FungibleTokenAdmin)
    );
    return {
      FungibleTokenAdmin: vk,
    };
  }
}
