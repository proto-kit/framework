import { Bool, Field, SelfProof, Struct } from "snarkyjs";

export class AppChainProofPublicInput extends Struct({
  transactionHash: Field,
  stateTransitionsHash: Field,
  status: Bool
}) {
}

export class AppChainProof extends SelfProof<AppChainProofPublicInput> {
}