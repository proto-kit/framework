import { ComputedBlock } from "../../../storage/model/Block";

export interface BlockProducingFunction {
  (): Promise<ComputedBlock | undefined>;
}

export interface BlockTrigger {
  setProduceBlock: (produceBlock: BlockProducingFunction) => void;

  start: () => Promise<void>;
}
