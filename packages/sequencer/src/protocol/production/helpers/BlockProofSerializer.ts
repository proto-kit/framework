import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  BlockProverPublicInput,
  BlockProverPublicOutput,
  MandatoryProtocolModulesRecord,
  Protocol,
} from "@proto-kit/protocol";

import { ProofTaskSerializer } from "../../../helpers/utils";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class BlockProofSerializer {
  private serializer?: ProofTaskSerializer<
    BlockProverPublicInput,
    BlockProverPublicOutput
  >;

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>
  ) {}

  public getBlockProofSerializer() {
    if (this.serializer === undefined) {
      const blockProver = this.protocol.resolve("BlockProver");
      const proofType = blockProver.zkProgrammable.zkProgram.Proof;
      this.serializer = new ProofTaskSerializer(proofType);
    }
    return this.serializer;
  }
}
