import "reflect-metadata";
import { state } from "@proto-kit/protocol";
import { Field, Struct, TokenId } from "o1js";
import { describe } from "@jest/globals";

import { RuntimeModule } from "../../src/runtime/RuntimeModule";
import { runtimeMethod } from "../../src/method/runtimeMethod";
import { OutgoingMessages } from "../../src/messages/OutgoingMessages";

class SampleWithdrawal extends Struct({
  data: Field,
}) {}

export class Example extends RuntimeModule {
  @state()
  messages = new OutgoingMessages({
    sample: SampleWithdrawal,
  });

  @runtimeMethod()
  public async foo() {
    await this.messages.emitMessage(
      "sample",
      new SampleWithdrawal({
        data: Field(1),
      }),
      TokenId.default
    );
  }
}

// TODO Add test

describe("d", () => {
  it("a", () => {
    class A {}

    class B extends A {}

    expect(new B() instanceof A).toBe(true);
  });
});
