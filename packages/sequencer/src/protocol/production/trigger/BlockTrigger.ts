export interface BlockProducingFunction {
  (): Promise<void>;
}

export interface BlockTrigger {
  setProduceBlock: (produceBlock: BlockProducingFunction) => void;

  start: () => Promise<void>;
}
