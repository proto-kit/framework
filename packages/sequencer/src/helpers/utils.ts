import { Field, Proof } from "o1js";
import { Subclass } from "@proto-kit/protocol";

import { TaskSerializer } from "../worker/manager/ReducableTask";

export function distinct<Value>(
  value: Value,
  index: number,
  array: Value[]
): boolean {
  return array.indexOf(value) === index;
}

export function distinctByPredicate<Value>(
  predicate: (a: Value, b: Value) => boolean
): (value: Value, index: number, array: Value[]) => boolean {
  return (v, index, array) => {
    return array.findIndex((other) => predicate(v, other)) === index;
  };
}

export function distinctByString<Value extends { toString: () => string }>(
  value: Value,
  index: number,
  array: Value[]
): boolean {
  return array.findIndex((it) => it.toString() === value.toString()) === index;
}

type JsonProof = ReturnType<typeof Proof.prototype.toJSON>;

export class ProofTaskSerializer<PublicInputType, PublicOutputType>
  implements TaskSerializer<Proof<PublicInputType, PublicOutputType>>
{
  public constructor(
    private readonly proofClass: Subclass<
      typeof Proof<PublicInputType, PublicOutputType>
    >
  ) {}

  public toJSON(proof: Proof<PublicInputType, PublicOutputType>): string {
    return JSON.stringify(this.toJSONProof(proof));
  }

  public toJSONProof(
    proof: Proof<PublicInputType, PublicOutputType>
  ): JsonProof {
    if (proof.proof === "mock-proof") {
      return {
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
      };
    }
    return proof.toJSON();
  }

  public fromJSON(json: string): Proof<PublicInputType, PublicOutputType> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.fromJSONProof(JSON.parse(json));
  }

  public fromJSONProof(
    jsonProof: JsonProof
  ): Proof<PublicInputType, PublicOutputType> {
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

export type PairTuple<Type> = [Type, Type];

export class PairProofTaskSerializer<PublicInputType, PublicOutputType>
  implements
    TaskSerializer<PairTuple<Proof<PublicInputType, PublicOutputType>>>
{
  private readonly proofSerializer = new ProofTaskSerializer(this.proofClass);

  public constructor(
    private readonly proofClass: Subclass<
      typeof Proof<PublicInputType, PublicOutputType>
    >
  ) {}

  public fromJSON(
    json: string
  ): PairTuple<Proof<PublicInputType, PublicOutputType>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const array: [JsonProof, JsonProof] = JSON.parse(json);
    return [
      this.proofSerializer.fromJSONProof(array[0]),
      this.proofSerializer.fromJSONProof(array[1]),
    ];
  }

  public toJSON(
    input: PairTuple<Proof<PublicInputType, PublicOutputType>>
  ): string {
    return JSON.stringify(
      input.map((element) => this.proofSerializer.toJSONProof(element))
    );
  }
}
