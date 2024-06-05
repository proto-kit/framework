import { Bool, Field, Struct } from "o1js";

/**
 * Public input used to link in-circuit execution with
 * the proof's public input.
 */
export class MethodPublicOutput extends Struct({
  stateTransitionsHash: Field,
  status: Bool,
  transactionHash: Field,
  networkStateHash: Field,
  isMessage: Bool,
}) {}
