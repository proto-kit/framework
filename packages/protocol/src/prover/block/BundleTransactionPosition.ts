import { Bool, Field, Struct } from "o1js";
import { match } from "ts-pattern";

export type BundleTransactionPositionType = "FIRST" | "LAST" | "MIDDLE";

export class BundleTransactionPosition extends Struct({
  type: Field,
}) {
  private static fieldMapping: Record<BundleTransactionPositionType, number> = {
    FIRST: 0,
    MIDDLE: 1,
    LAST: 2,
  };

  public equals(type: BundleTransactionPosition): Bool {
    return this.type.equals(type.type);
  }

  public static fromPositionType(type: BundleTransactionPositionType) {
    return new BundleTransactionPosition({
      type: Field(BundleTransactionPosition.fieldMapping[type]).toConstant(),
    });
  }

  public static positionTypeFromIndex(index: number, bundleLength: number) {
    return match<number, BundleTransactionPositionType>(index)
      .with(0, () => "FIRST")
      .with(bundleLength - 1, () => "LAST")
      .otherwise(() => "MIDDLE");
  }
}
