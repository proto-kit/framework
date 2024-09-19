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

export class PrimaryTestEvent extends Struct({
  message: Bool,
}) {}

export class SecondaryTestEvent extends Struct({
  message: Bool,
}) {}

@runtimeModule()
class EventMaker extends RuntimeModule {
  public constructor() {
    super();
  }

  public events = new RuntimeEvents({
    primary: PrimaryTestEvent,
    secondary: SecondaryTestEvent,
  });

  @runtimeMethod()
  public async makeEvent() {
    this.events.emit("primary", new PrimaryTestEvent({ message: Bool(false) }));
    // Should not emit as condition is false.
    this.events.emitIf(
      "primary",
      new PrimaryTestEvent({ message: Bool(false) }),
      Bool(false)
    );
    this.events.emit(
      "secondary",
      new SecondaryTestEvent({ message: Bool(true) })
    );
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
    expect.assertions(5);

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

    const firstExpectedEvent = {
      eventType: PrimaryTestEvent,
      event: new PrimaryTestEvent({
        message: Bool(false),
      }),
      eventName: "primary",
      condition: Bool(true),
    };

    const secondExpectedEvent = {
      eventType: PrimaryTestEvent,
      event: new PrimaryTestEvent({
        message: Bool(false),
      }),
      eventName: "primary",
      condition: Bool(false),
    };

    const thirdExpectedEvent = {
      eventType: SecondaryTestEvent,
      event: new SecondaryTestEvent({
        message: Bool(true),
      }),
      eventName: "secondary",
      condition: Bool(true),
    };

    const eventsResults = context.current().result.events;
    expect(eventsResults).toHaveLength(3);
    expect(eventsResults[0]).toStrictEqual(firstExpectedEvent);
    expect(eventsResults[1]).toStrictEqual(secondExpectedEvent);
    expect(eventsResults[2]).toStrictEqual(thirdExpectedEvent);

    context.afterMethod();

    const proof = await context.current().result.prover!();
    const publicOuput = proof.publicOutput as MethodPublicOutput;
    const { eventsHash } = publicOuput;
    //  Note that we omit the second event from below as it was
    //  not emitted due to the condition being false.
    expect(eventsHash).toStrictEqual(
      toEventsHash([
        { ...firstExpectedEvent, condition: Bool(true) },
        { ...thirdExpectedEvent, condition: Bool(true) },
      ])
    );
  });
});
