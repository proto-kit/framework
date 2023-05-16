import { Bool, Field, Struct } from "snarkyjs";

/**
 * Public input used to link in-circuit execution with
 * the proof's public input.
 */
export class MethodPublicInput extends Struct({
  stateTransitionsHash: Field,
  status: Bool,
  transactionHash: Field,
}) {}
