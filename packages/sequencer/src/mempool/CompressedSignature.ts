import { type Field, Scalar, Signature } from "o1js";
import { notInCircuit } from "@proto-kit/protocol";

/**
 * CompressedSignature compresses the s scalar of a Signature
 * (which is expanded to 256 Fields in snarkyjs) to a single string
 */
export class CompressedSignature {
  @notInCircuit()
  public static fromSignature(sig: Signature) {
    const scalar = Scalar.toJSON(sig.s);
    return new CompressedSignature(sig.r, scalar);
  }

  public constructor(
    public readonly r: Field,
    public readonly s: string
  ) {}

  @notInCircuit()
  public toSignature(): Signature {
    const s = Scalar.fromJSON(this.s);

    return Signature.fromObject({
      r: this.r,

      s,
    });
  }
}
