import type { OpcodeDefinitions, ProxyInstructions } from "../types";
import { FieldInstructions, FieldProxies } from "./Field";
import { PoseidonInstructions, PoseidonInstructionsProxy } from "./Poseidon";

export const DefaultInstructions =
  {
    ...FieldInstructions,
    ...PoseidonInstructions
  }  satisfies OpcodeDefinitions

export const DefaultInstructionsProxy =
  {
    ...FieldProxies,
    ...PoseidonInstructionsProxy
  } satisfies ProxyInstructions<typeof DefaultInstructions>;