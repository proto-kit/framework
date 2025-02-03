import {
  ReturnType,
  RuntimeVerificationKeyAttestation,
  VKTreeWitness,
} from "@proto-kit/protocol";

import { VerificationKeySerializer } from "./VerificationKeySerializer";

export class RuntimeVerificationKeyAttestationSerializer {
  static fromJSON(json: {
    verificationKey: { hash: string; data: string };
    witness: ReturnType<typeof VKTreeWitness.toJSON>;
  }) {
    return new RuntimeVerificationKeyAttestation({
      verificationKey: VerificationKeySerializer.fromJSON(json.verificationKey),
      witness: new VKTreeWitness(VKTreeWitness.fromJSON(json.witness)),
    });
  }

  static toJSON(attestation: RuntimeVerificationKeyAttestation) {
    return {
      verificationKey: VerificationKeySerializer.toJSON(
        attestation.verificationKey
      ),
      witness: VKTreeWitness.toJSON(attestation.witness),
    };
  }
}
