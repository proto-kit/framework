import { BlockProverExecutionData } from "../prover/block/BlockProvable";
import { Protocol, ProtocolModulesRecord } from "./Protocol";

export abstract class BlockModule {
  abstract createTransitions: (executionData: BlockProverExecutionData) => void;

  public name?: string;

  public protocol?: Protocol<ProtocolModulesRecord>;
}