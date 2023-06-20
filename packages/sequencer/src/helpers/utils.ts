import { Proof } from "snarkyjs";
import { Subclass } from "@yab/protocol";

export function distinct<Value>(
  value: Value,
  index: number,
  array: Value[]
): boolean {
  return array.indexOf(value) === index;
}

export class ProofTaskSerializer<PublicInputType> {
  public constructor(
    private readonly proofClass: Subclass<typeof Proof<PublicInputType>>
  ) {}

  public toJSON(proof: Proof<PublicInputType>): string {
    return JSON.stringify(proof.toJSON());
  }

  public fromJSON(json: string): Proof<PublicInputType> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const jsonProof: ReturnType<typeof Proof.prototype.toJSON> =
      JSON.parse(json);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.proofClass.fromJSON(jsonProof);
  }
}
