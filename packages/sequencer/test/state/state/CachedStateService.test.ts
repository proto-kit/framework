import { beforeEach } from "@jest/globals";
import { Field } from "o1js";
import { expectDefined } from "@proto-kit/common";

import { AsyncStateService, CachedStateService } from "../../../src";

describe("cachedStateService", () => {
  let baseService: AsyncStateService;
  let mask1: CachedStateService;
  let mask2: CachedStateService;

  beforeEach(async () => {
    baseService = new CachedStateService(undefined);

    baseService.writeStates([
      {
        key: Field(5),
        value: [Field(1), Field(2)],
      },
    ]);
    await baseService.commit();

    mask1 = new CachedStateService(baseService);
    mask2 = new CachedStateService(mask1);
  });

  it("should preload through multiple layers of services", async () => {
    await mask2.preloadKey(Field(5));

    const record = await mask2.get(Field(5));

    expectDefined(record);
    expect(record).toHaveLength(2);
    expect(record[0].toString()).toStrictEqual("1");
    expect(record[1].toString()).toStrictEqual("2");
  });

  it("should set through multiple layers of services with merging", async () => {
    await mask2.set(Field(6), [Field(3)]);
    await mask2.mergeIntoParent();

    await expect(baseService.get(Field(6))).resolves.toBeUndefined();

    await mask1.mergeIntoParent();

    const record = await baseService.get(Field(6));

    expectDefined(record);
    expect(record).toHaveLength(1);
    expect(record[0].toString()).toStrictEqual("3");
  });

  it("should delete correctly through multiple layers of services", async () => {
    await mask2.preloadKey(Field(5));

    await mask2.set(Field(5), undefined);

    await mask1.preloadKey(Field(5));
    await expect(mask1.get(Field(5))).resolves.toHaveLength(2);

    await mask2.mergeIntoParent();
    await mask1.mergeIntoParent();

    const value = await baseService.get(Field(5));
    expect(value).toBeUndefined();
  });

  it("should delete correctly when deleting in the middle", async () => {
    await mask1.set(Field(5), undefined);

    await expect(mask2.get(Field(5))).resolves.toBeUndefined();
  });
});
