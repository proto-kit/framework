import { type Field, Scalar, Signature } from "snarkyjs";
import { NotInCircuit } from "@yab/protocol";

// Not in circuit
export class CompressedSignature {

  @NotInCircuit()
  public static fromSignature(sig: Signature) {
    const s = Scalar.toJSON(sig.s);
    return new CompressedSignature(sig.r, s);
  }

  public constructor(public readonly r: Field, public readonly s: string) {
  }

  @NotInCircuit()
  public toSignature(): Signature {

    const s = Scalar.fromJSON(this.s);

    return Signature.fromObject({
      r: this.r,
      s
    });
  }
}
