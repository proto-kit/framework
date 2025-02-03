import { Field } from "o1js";

export interface AreProofsEnabled {
  areProofsEnabled: boolean;
  setProofsEnabled: (areProofsEnabled: boolean) => void;
}
export interface CompileArtifact {
  verificationKey: {
    data: string;
    hash: Field;
  };
}

export interface Compile {
  (): Promise<CompileArtifact>;
}

export const MOCK_PROOF = "mock-proof";

export const MOCK_VERIFICATION_KEY = {
  data: "mock-verification-key",
  hash: Field(0),
};
