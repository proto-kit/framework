import "reflect-metadata";
import { expectDefined } from "@proto-kit/common";
import { Field, PrivateKey } from "o1js";

import { InMemorySigner } from "../../src";

describe("InMemorySigner", () => {
  let module: InMemorySigner;

  const configuredKey = PrivateKey.random();

  const msg = [Field(1), Field(2)];

  beforeEach(() => {
    module = new InMemorySigner();

    module.config = {
      signers: [configuredKey],
    };
  });

  it("should sign with config key", async () => {
    expect.assertions(2);
    const signature = await module.sign(configuredKey.toPublicKey(), msg);

    expectDefined(signature);

    expect(signature.verify(configuredKey.toPublicKey(), msg).toBoolean()).toBe(true);
  });

  it("should sign with additional key", async () => {
    expect.assertions(2);

    const key2 = PrivateKey.random();
    module.addSigner(key2);

    const signature = await module.sign(key2.toPublicKey(), msg);

    expectDefined(signature);

    expect(signature.verify(key2.toPublicKey(), msg).toBoolean()).toBe(true);
  });

  it("should not sign for unconfigured key", async () => {
    expect.assertions(1);

    const key2 = PrivateKey.random();
    const signature = await module.sign(key2.toPublicKey(), msg);

    expect(signature).toBeUndefined();
  });
});
