import { Field, VerificationKey } from "o1js";

export type VerificationKeyJSON = { data: string; hash: string };

export class VerificationKeySerializer {
  public static toJSON(verificationKey: VerificationKey): VerificationKeyJSON {
    return {
      data: verificationKey.data,
      hash: verificationKey.hash.toJSON(),
    };
  }

  public static fromJSON(json: VerificationKeyJSON): VerificationKey {
    return new VerificationKey({
      data: json.data,
      hash: Field.fromJSON(json.hash),
    });
  }
}
