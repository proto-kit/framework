import { Field, Proof } from "snarkyjs";
import { Subclass } from "@proto-kit/protocol";

import { TaskSerializer } from "../worker/manager/ReducableTask";

export function distinct<Value>(
  value: Value,
  index: number,
  array: Value[]
): boolean {
  return array.indexOf(value) === index;
}

export class ProofTaskSerializer<PublicInputType, PublicOutputType>
  implements TaskSerializer<Proof<PublicInputType, PublicOutputType>>
{
  public constructor(
    private readonly proofClass: Subclass<
      typeof Proof<PublicInputType, PublicOutputType>
    >
  ) {}

  public toJSON(proof: Proof<PublicInputType, PublicOutputType>): string {
    if (proof.proof === "mock-proof") {
      return JSON.stringify({
        publicInput: this.proofClass.publicInputType
          // eslint-disable-next-line max-len
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-explicit-any
          .toFields(proof.publicInput as any)
          .map(String),

        publicOutput: this.proofClass.publicOutputType
          // eslint-disable-next-line max-len
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-explicit-any
          .toFields(proof.publicOutput as any)
          .map(String),

        maxProofsVerified: proof.maxProofsVerified,
        proof: "mock-proof",
      });
    }
    return JSON.stringify(proof.toJSON());
  }

  public fromJSON(json: string): Proof<PublicInputType, PublicOutputType> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const jsonProof: ReturnType<typeof Proof.prototype.toJSON> =
      JSON.parse(json);

    if (jsonProof.proof === "mock-proof") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const publicInput: PublicInputType =
        this.proofClass.publicInputType.fromFields(
          jsonProof.publicInput.map(Field)
        );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const publicOutput: PublicOutputType =
        this.proofClass.publicOutputType.fromFields(
          jsonProof.publicOutput.map(Field)
        );
      // eslint-disable-next-line new-cap
      return new this.proofClass({
        publicInput,
        publicOutput,
        proof: "mock-proof",
        maxProofsVerified: jsonProof.maxProofsVerified,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.proofClass.fromJSON(jsonProof);
  }
}
