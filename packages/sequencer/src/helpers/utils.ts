import { Field, Proof, DynamicProof } from "o1js";
import { Subclass } from "@proto-kit/protocol";
import { MOCK_PROOF, TypedClass } from "@proto-kit/common";
import { Memoize } from "typescript-memoize";

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

abstract class ProofTaskSerializerBase<
  PublicInputType,
  PublicOutputType,
  Type extends
    | (TypedClass<Proof<PublicInputType, PublicOutputType>> &
        typeof Proof<PublicInputType, PublicOutputType>)
    | (TypedClass<DynamicProof<PublicInputType, PublicOutputType>> &
        typeof DynamicProof<PublicInputType, PublicOutputType>),
> {
  protected constructor(
    private readonly proofClassInternalFun: () => Promise<Subclass<Type>>
  ) {}

  @Memoize()
  protected get proofClass() {
    return this.proofClassInternalFun();
  }

  protected async getDummy(
    c: Subclass<Type>,
    jsonProof: JsonProof
  ): Promise<InstanceType<Type>> {
    const proofClass = await this.proofClass;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const publicInput: PublicInputType = proofClass.publicInputType.fromFields(
      jsonProof.publicInput.map(Field),
      []
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const publicOutput: PublicOutputType =
      proofClass.publicOutputType.fromFields(
        jsonProof.publicOutput.map(Field),
        []
      );
    // eslint-disable-next-line new-cap
    return new c({
      publicInput,
      publicOutput,
      proof: MOCK_PROOF,
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

  public async toJSONProof(
    proof:
      | Proof<PublicInputType, PublicOutputType>
      | DynamicProof<PublicInputType, PublicOutputType>
  ): Promise<JsonProof> {
    if (proof.proof === MOCK_PROOF) {
      const proofClass = await this.proofClass;
      return {
        publicInput: proofClass.publicInputType
          // eslint-disable-next-line max-len
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions,@typescript-eslint/no-unsafe-argument
          .toFields(proof.publicInput as any)
          .map(String),

        publicOutput: proofClass.publicOutputType
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
  extends ProofTaskSerializerBase<
    PublicInputType,
    PublicOutputType,
    typeof Proof<PublicInputType, PublicOutputType>
  >
  implements TaskSerializer<Proof<PublicInputType, PublicOutputType>>
{
  public constructor(
    proofClass: () => Promise<typeof Proof<PublicInputType, PublicOutputType>>
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
    if (jsonProof.proof === MOCK_PROOF) {
      return await this.getDummy(await this.proofClass, jsonProof);
    }

    return await (await this.proofClass).fromJSON(jsonProof);
  }
}

export class DynamicProofTaskSerializer<PublicInputType, PublicOutputType>
  extends ProofTaskSerializerBase<
    PublicInputType,
    PublicOutputType,
    typeof DynamicProof<PublicInputType, PublicOutputType>
  >
  implements TaskSerializer<DynamicProof<PublicInputType, PublicOutputType>>
{
  public constructor(
    proofClass: () => Promise<
      Subclass<typeof DynamicProof<PublicInputType, PublicOutputType>>
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
    const proofClass = await this.proofClass;

    if (jsonProof.proof === MOCK_PROOF) {
      return await this.getDummy(proofClass, jsonProof);
    }

    return await proofClass.fromJSON(jsonProof);
  }
}

export type PairTuple<Type> = [Type, Type];

export class PairProofTaskSerializer<
  PublicInputType,
  PublicOutputType,
> implements TaskSerializer<
  PairTuple<Proof<PublicInputType, PublicOutputType>>
> {
  private readonly proofSerializer = new ProofTaskSerializer(
    this.proofClassFun
  );

  public constructor(
    private readonly proofClassFun: () => Promise<
      Subclass<typeof Proof<PublicInputType, PublicOutputType>>
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
