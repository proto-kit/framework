import { Field } from "o1js";

export const MaskName = {
  block(height: bigint | Field) {
    const heightBigint =
      typeof height === "bigint" ? height : height.toBigInt();
    return `block-${heightBigint}`;
  },
  base: () => "base",
};
