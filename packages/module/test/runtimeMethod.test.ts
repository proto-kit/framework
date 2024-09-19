import "reflect-metadata";
import {
  PublicKey,
  Struct,
  Bool,
  PrivateKey,
  Field,
  UInt64,
  Poseidon,
} from "o1js";
import {
  MethodPublicOutput,
  NetworkState,
  RuntimeMethodExecutionContext,
  RuntimeTransaction,
} from "@proto-kit/protocol";
import { container } from "tsyringe";
import { AreProofsEnabled, log } from "@proto-kit/common";

import {
  Runtime,
  MethodParameterEncoder,
  runtimeModule,
  RuntimeModule,
  runtimeMethod,
  toEventsHash,
  RuntimeEvents,
} from "../src";

import { Balances } from "./modules/Balances";
import { createTestingRuntime } from "./TestingRuntime";

export class TestEvent extends Struct({
  message: Bool,
}) {}

@runtimeModule()
class EventMaker extends RuntimeModule {
  public constructor() {
    super();
  }

  public events = new RuntimeEvents({
    test: TestEvent,
  });

  @runtimeMethod()
  public async makeEvent() {
    this.events.emit("test", new TestEvent({ message: Bool(false) }));
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

  it("should create correct param types", async () => {
    expect.assertions(1 + parameters.length);

    const module = runtime.resolve("Balances");

    const decoder = MethodParameterEncoder.fromMethod(module, "getBalance");
    const recodedParameters = await decoder.decode(
      parameters.flatMap((x) => x.toFields()),
      []
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
    await module.getBalance(PublicKey.empty<typeof PublicKey>());

    context.setup({
      transaction: RuntimeTransaction.dummyTransaction(),
      networkState: NetworkState.empty(),
    });

    await expect(context.current().result.prover!()).rejects.toThrow(
      "Runtimemethod called with wrong methodId on the transaction object"
    );
  });

  it("should capture event", async () => {
    expect.assertions(3);

    const context = container.resolve(RuntimeMethodExecutionContext);

    runtime.registerValue({
      AppChain: {
        areProofsEnabled: false,
      } as AreProofsEnabled,
    });

    const eventMakerMethodId = runtime.methodIdResolver.getMethodId(
      "EventMaker",
      "makeEvent"
    );

    const privateKey = PrivateKey.random();
    context.setup({
      transaction: RuntimeTransaction.fromTransaction({
        sender: privateKey.toPublicKey(),
        nonce: UInt64.from(0),
        methodId: Field(eventMakerMethodId),
        argsHash: Poseidon.hash([]),
      }),
      networkState: NetworkState.empty(),
    });

    const module = runtime.resolve("EventMaker");
    await module.makeEvent();

    const expectedEvent = {
      eventType: TestEvent,
      event: new TestEvent({
        message: Bool(false),
      }),
      eventName: "test",
    };
    const eventsResults = context.current().result.events;
    expect(eventsResults).toHaveLength(1);
    expect(eventsResults[0]).toStrictEqual(expectedEvent);

    context.afterMethod();

    const proof = await context.current().result.prover!();
    const publicOuput = proof.publicOutput as MethodPublicOutput;
    const { eventsHash } = publicOuput;
    expect(eventsHash).toStrictEqual(
      toEventsHash([{ ...expectedEvent, condition: Bool(true) }])
    );
  });
});
