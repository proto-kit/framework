import { Bool, Field, Struct } from "o1js";
import { match } from "ts-pattern";

export type BlockTransactionPositionType = "FIRST" | "LAST" | "MIDDLE";

export class BlockTransactionPosition extends Struct({
  type: Field,
}) {
  private static readonly fieldMapping: Record<
    BlockTransactionPositionType,
    number
  > = {
    FIRST: 0,
    MIDDLE: 1,
    LAST: 2,
  };

  public static fromPositionType(type: BlockTransactionPositionType) {
    return new BlockTransactionPosition({
      type: Field(BlockTransactionPosition.fieldMapping[type]).toConstant(),
    });
  }

  public static positionTypeFromIndex(index: number, bundleLength: number) {
    return match<number, BlockTransactionPositionType>(index)
      .with(0, () => "FIRST")
      .with(bundleLength - 1, () => "LAST")
      .otherwise(() => "MIDDLE");
  }

  public equals(type: BlockTransactionPosition): Bool {
    return this.type.equals(type.type);
  }
}
