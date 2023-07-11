import { Proof } from "snarkyjs";
import { Subclass } from "@yab/protocol";
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
    return JSON.stringify(proof.toJSON());
  }

  public fromJSON(json: string): Proof<PublicInputType, PublicOutputType> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const jsonProof: ReturnType<typeof Proof.prototype.toJSON> =
      JSON.parse(json);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.proofClass.fromJSON(jsonProof);
  }
}
