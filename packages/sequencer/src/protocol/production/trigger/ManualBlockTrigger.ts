import { injectable } from "tsyringe";
import { BlockProducingFunction, BlockTrigger } from "./BlockTrigger";

@injectable()
export class ManualBlockTrigger implements BlockTrigger {
  private produceBlockAction: BlockProducingFunction;

  setProduceBlock(produceBlock: BlockProducingFunction): void {
    this.produceBlockAction = produceBlock;
  }

  public async produceBlock() : Promise<void> {
    await this.produceBlockAction()
  }

  public async start(): Promise<void> {}
}