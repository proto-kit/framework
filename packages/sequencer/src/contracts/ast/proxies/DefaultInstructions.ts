import type { OpcodeDefinitions, ProxyInstructions } from "../types";
import { FieldInstructions, FieldProxies } from "./Field";
import { PoseidonInstructions, PoseidonInstructionsProxy } from "./Poseidon";
import { StateInstructions, StateInstructionProxy } from "./State";
import { ProvableInstructions, ProvableInstructionsProxy } from "./Provable";

export const DefaultInstructions = {
  ...FieldInstructions,
  ...PoseidonInstructions,
  ...StateInstructions,
  ...ProvableInstructions,
} satisfies OpcodeDefinitions;

export const DefaultInstructionsProxy = {
  ...FieldProxies,
  ...PoseidonInstructionsProxy,
  ...StateInstructionProxy,
  ...ProvableInstructionsProxy
} satisfies ProxyInstructions<typeof DefaultInstructions>;
