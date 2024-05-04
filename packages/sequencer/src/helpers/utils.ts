import { Field, Proof, DynamicProof } from "o1js";
import { Subclass } from "@proto-kit/protocol";
import { MOCK_PROOF, TypedClass } from "@proto-kit/common";

import { TaskSerializer } from "../worker/flow/Task";

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

abstract class ProofTaskSerializerBase<PublicInputType, PublicOutputType> {
  protected constructor(
    private readonly proofClassInternal: Subclass<
      | typeof Proof<PublicInputType, PublicOutputType>
      | typeof DynamicProof<PublicInputType, PublicOutputType>
    >
  ) {}

  protected getDummy<
    T extends
      | Proof<PublicInputType, PublicOutputType>
      | DynamicProof<PublicInputType, PublicOutputType>,
  >(c: TypedClass<T>, jsonProof: JsonProof): T {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const publicInput: PublicInputType =
      this.proofClassInternal.publicInputType.fromFields(
        jsonProof.publicInput.map(Field)
      );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const publicOutput: PublicOutputType =
      this.proofClassInternal.publicOutputType.fromFields(
        jsonProof.publicOutput.map(Field)
      );
    // eslint-disable-next-line new-cap
    return new c({
      publicInput,
      publicOutput,
      proof: "mock-proof",
      maxProofsVerified: jsonProof.maxProofsVerified,
    });
  }

  public toJSON(
    proof:
      | Proof<PublicInputType, PublicOutputType>
      | DynamicProof<PublicInputType, PublicOutputType>
  ): string {
    return JSON.stringify(this.toJSONProof(proof));
  }

  public toJSONProof(
    proof:
      | Proof<PublicInputType, PublicOutputType>
      | DynamicProof<PublicInputType, PublicOutputType>
  ): JsonProof {
    if (proof.proof === MOCK_PROOF) {
      return {
        publicInput: this.proofClassInternal.publicInputType
          // eslint-disable-next-line max-len
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-argument
          .toFields(proof.publicInput as any)
          .map(String),

        publicOutput: this.proofClassInternal.publicOutputType
          // eslint-disable-next-line max-len
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-argument
          .toFields(proof.publicOutput as any)
          .map(String),

        maxProofsVerified: proof.maxProofsVerified,
        proof: MOCK_PROOF,
      };
    }
    return proof.toJSON();
  }
}

export class ProofTaskSerializer<PublicInputType, PublicOutputType>
  extends ProofTaskSerializerBase<PublicInputType, PublicOutputType>
  implements TaskSerializer<Proof<PublicInputType, PublicOutputType>>
{
  public constructor(
    private readonly proofClass: Subclass<
      typeof Proof<PublicInputType, PublicOutputType>
    >
  ) {
    super(proofClass);
  }

  public async fromJSON(
    json: string
  ): Promise<Proof<PublicInputType, PublicOutputType>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return await this.fromJSONProof(JSON.parse(json));
  }

  public async fromJSONProof(
    jsonProof: JsonProof
  ): Promise<Proof<PublicInputType, PublicOutputType>> {
    if (jsonProof.proof === "mock-proof") {
      return this.getDummy(this.proofClass, jsonProof);
    }

    return await this.proofClass.fromJSON(jsonProof);
  }
}

export class DynamicProofTaskSerializer<PublicInputType, PublicOutputType>
  extends ProofTaskSerializerBase<PublicInputType, PublicOutputType>
  implements TaskSerializer<DynamicProof<PublicInputType, PublicOutputType>>
{
  public constructor(
    private readonly proofClass: Subclass<
      typeof DynamicProof<PublicInputType, PublicOutputType>
    >
  ) {
    super(proofClass);
  }

  public async fromJSON(
    json: string
  ): Promise<DynamicProof<PublicInputType, PublicOutputType>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return await this.fromJSONProof(JSON.parse(json));
  }

  public async fromJSONProof(
    jsonProof: JsonProof
  ): Promise<DynamicProof<PublicInputType, PublicOutputType>> {
    if (jsonProof.proof === "mock-proof") {
      return this.getDummy(this.proofClass, jsonProof);
    }

    const { proofClass } = this;

    return await proofClass.fromJSON(jsonProof);
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

  public async fromJSON(
    json: string
  ): Promise<PairTuple<Proof<PublicInputType, PublicOutputType>>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const array: [JsonProof, JsonProof] = JSON.parse(json);
    return [
      await this.proofSerializer.fromJSONProof(array[0]),
      await this.proofSerializer.fromJSONProof(array[1]),
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
