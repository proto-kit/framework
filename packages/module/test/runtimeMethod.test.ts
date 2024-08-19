import "reflect-metadata";
import { PublicKey, Struct, Bool, PrivateKey } from "o1js";
import {
  MethodPublicOutput,
  NetworkState,
  RuntimeMethodExecutionContext,
  RuntimeTransaction,
} from "@proto-kit/protocol";
import { container } from "tsyringe";
import { AreProofsEnabled, log } from "@proto-kit/common";
import { createTransaction } from "o1js/dist/node/lib/mina/transaction";

import {
  Runtime,
  MethodParameterEncoder,
  runtimeModule,
  RuntimeModule,
  runtimeMethod,
  toEventsHash,
} from "../src";

import { Balances } from "./modules/Balances";
import { createTestingRuntime } from "./TestingRuntime";

export class TestEvent extends Struct({
  message: Bool,
}) {}

@runtimeModule()
class EventMaker extends RuntimeModule<unknown> {
  public constructor() {
    super();
  }

  public events = {
    test: TestEvent,
  };

  @runtimeMethod()
  public async makeEvent() {
    this.emit("test", new TestEvent({ message: Bool(false) }));
  }
}

describe("runtimeMethod", () => {
  const parameters = [PublicKey.empty<typeof PublicKey>()];

  let runtime: Runtime<{
    Balances: typeof Balances;
    EventMaker: typeof EventMaker;
  }>;

  beforeEach(() => {
    log.setLevel(log.levels.DEBUG);
    ({ runtime } = createTestingRuntime(
      {
        Balances,
        EventMaker,
      },
      {
        Balances: {},
        EventMaker: {},
      }
    ));
  });

  it("should create correct param types", () => {
    expect.assertions(1 + parameters.length);

    const module = runtime.resolve("Balances");

    const decoder = MethodParameterEncoder.fromMethod(module, "getBalance");
    const recodedParameters = decoder.decodeFields(
      parameters.flatMap((x) => x.toFields())
    );

    expect(parameters).toHaveLength(recodedParameters.length);

    parameters.forEach((parameter, index) => {
      expect(parameter).toStrictEqual(recodedParameters[index]);
    });
  });

  it("should throw on incorrect methodId on tx", async () => {
    expect.assertions(1);

    const context = container.resolve(RuntimeMethodExecutionContext);

    runtime.registerValue({
      AppChain: {
        areProofsEnabled: false,
      } as AreProofsEnabled,
    });

    context.setup({
      transaction: RuntimeTransaction.dummyTransaction(),
      networkState: NetworkState.empty(),
    });

    const module = runtime.resolve("Balances");
    module.getBalance(PublicKey.empty<typeof PublicKey>());

    context.setup({
      transaction: RuntimeTransaction.dummyTransaction(),
      networkState: NetworkState.empty(),
    });

    await expect(context.current().result.prover!()).rejects.toThrow(
      "Runtimemethod called with wrong methodId on the transaction object"
    );
  });

  it("should capture event", async () => {
    expect.assertions(2);

    const context = container.resolve(RuntimeMethodExecutionContext);

    runtime.registerValue({
      AppChain: {
        areProofsEnabled: false,
      } as AreProofsEnabled,
    });

    // const privateKey = PrivateKey.random();
    // context.setup({
    //   transaction: new RuntimeTransaction({
    //     runtime,
    //     method: ["EventMaker", "MakeEvent"],
    //     privateKey,
    //     args: [],
    //     // nonce: 0,
    //   }),
    //   networkState: NetworkState.empty(),
    // });

    // context.beforeMethod();

    const module = runtime.resolve("EventMaker");
    module.makeEvent();

    const expectedEvent = {
      event: new TestEvent({
        message: Bool(false),
      }),
      eventName: "test",
      eventType: TestEvent,
    };
    const eventsResults = context.current().result.events;
    expect(eventsResults).toHaveLength(1);
    expect(eventsResults[0]).toStrictEqual(expectedEvent);

  //   const proof = await context.current().result.prover!();
    //   const publicOuput = proof.publicOutput as MethodPublicOutput;
  //   const { eventsHash } = publicOuput;
  //   expect(eventsHash).toStrictEqual(toEventsHash([expectedEvent]));
  // });
  });
});
