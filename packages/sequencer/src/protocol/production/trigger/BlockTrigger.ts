import { ComputedBlock } from "../../../storage/model/Block";

export interface BlockProducingFunction {
  (): Promise<ComputedBlock | undefined>;
}

/**
 * A BlockTrigger is the primary method to start the production of a block and
 * all associated processes.
 */
export interface BlockTrigger {
  /**
   * This method will be called by the BlockProducerModule and provides the
   * function that should be called to trigger block production
   */
  // setProduceBlock: (produceBlock: BlockProducingFunction) => void;
  //
  // start: () => Promise<void>;
}
