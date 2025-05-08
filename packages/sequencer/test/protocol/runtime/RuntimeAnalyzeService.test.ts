import "reflect-metadata";
import {
  createTestingRuntime,
  Runtime,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import { expectDefined } from "@proto-kit/common";

import { RuntimeAnalyzerService } from "../../../src";
import { Balance } from "../../integration/mocks/Balance";

describe("RuntimeAnalyzerService", () => {
  let service: RuntimeAnalyzerService | undefined = undefined;

  beforeAll(() => {
    const { runtime } = createTestingRuntime({ Balance }, { Balance: {} });

    service = new RuntimeAnalyzerService(
      runtime as unknown as Runtime<RuntimeModulesRecord>
    );
  });

  it("should analyze static method correctly", async () => {
    const info = await service!.getRuntimeInfo();
    const depositInfo = info["Balance.deposit"];

    expectDefined(depositInfo);
    expect(depositInfo.rows).toBeGreaterThan(10);
    expect(depositInfo.dynamicKeyAccess).toBe(false);
    expect(depositInfo.invocationType).toBe("INCOMING_MESSAGE");
  });

  it("should analyze dynamic method correctly", async () => {
    const info = await service!.getRuntimeInfo();
    const depositInfo = info["Balance.dynamicKeyTest"];

    expectDefined(depositInfo);
    expect(depositInfo.rows).toBeGreaterThan(10);
    expect(depositInfo.dynamicKeyAccess).toBe(true);
    expect(depositInfo.invocationType).toBe("SIGNATURE");
  });
});
