import { inject, injectable } from "tsyringe";
import {
  Field,
  Poseidon,
  PrivateKey,
  PublicKey,
  Signature,
  UInt32,
  UInt64,
} from "o1js";
import {
  Runtime,
  RuntimeModulesRecord,
  MethodParameterEncoder,
} from "@proto-kit/module";
import {
  EMPTY_PUBLICKEY,
  mapSequential,
  ModuleContainerLike,
} from "@proto-kit/common";
import {
  DispatchContractProtocolModule,
  RuntimeTransaction,
  SettlementContractModule,
} from "@proto-kit/protocol";

import {
  PendingTransaction,
} from "../../mempool/PendingTransaction";
import type { MinaBaseLayer } from "../../protocol/baselayer/MinaBaseLayer";

import { IncomingMessageAdapter } from "./IncomingMessageAdapter";

/**
 * IncomingMessageAdapter implementation for a Mina Baselayer
 * based on decoding L1-dispatched actions
 */
@injectable()
export class MinaIncomingMessageAdapter implements IncomingMessageAdapter {
  public constructor(
    @inject("BaseLayer")
    private readonly baseLayer: MinaBaseLayer,
    @inject("Runtime") private readonly runtime: Runtime<RuntimeModulesRecord>,
    @inject("Protocol") private readonly protocol: ModuleContainerLike
  ) {}

  private incomingMessageEventIndex() {
    const contractModule = this.protocol.resolveOrFail(
      "SettlementContractModule",
      SettlementContractModule
    );
    const DispatchContractModule = contractModule.resolveOrFail(
      "DispatchContract",
      DispatchContractProtocolModule
    );
    const index = Object.keys(DispatchContractModule.eventsDefinition())
      .sort()
      .indexOf("incoming-message-placeholder");

    if (index < 0) {
      throw new Error(
        "Placeholder event for incoming messages couldn't be found"
      );
    }

    return index;
  }

  private async mapActionToTransactions(
    tx: RuntimeTransaction,
    fieldArgs: string[]
  ): Promise<PendingTransaction> {
    const { methodId } = tx;

    const methodPointer = this.runtime.methodIdResolver.getMethodNameFromId(
      methodId.toString()
    );

    if (methodPointer === undefined) {
      throw new Error(`Runtime method with methodId ${methodId} doesn't exist`);
    }

    const [moduleName, methodName] = methodPointer;
    const module = this.runtime.resolve(moduleName);
    const methodEncoder = MethodParameterEncoder.fromMethod(module, methodName);

    // The reason why auxiliary is empty here, is that proof verification in the case
    // of incoming messages has to happen on the L1 for multiple reasons.
    const args = await methodEncoder.decode(fieldArgs, []);

    const { fields, auxiliary } = methodEncoder.encode(args);
    const signature = Signature.create(PrivateKey.random(), [Field(0)]);
    const hash = Poseidon.hash([
      methodId,
      ...EMPTY_PUBLICKEY.toFields(),
      ...UInt64.zero.toFields(),
      Poseidon.hash(fields),
    ]).toString();


    return new PendingTransaction({
      hash,
      methodId: methodId.toString(),
      sender: EMPTY_PUBLICKEY.toBase58(),
      nonce: UInt64.zero.toString(),
      signature: { r: signature.r.toJSON(), s: signature.s.toJSON() },
      argsFields: fields.map((f) => f.toString()),
      auxiliaryData: auxiliary,
      isMessage: true,
    });
  }

  public async fetchPendingMessages(
    address: PublicKey,
    params: {
      fromActionHash: string;
      toActionHash?: string;
      fromL1BlockHeight: number;
    }
  ): Promise<{
    from: string;
    to: string;
    messages: PendingTransaction[];
  }> {
    const { network } = this.baseLayer;
    if (network === undefined) {
      throw new Error("Network hasn't been set for settlement");
    }
    if (address === undefined) {
      throw new Error("L1 contract hasn't been deployed yet");
    }

    const toActionHashField =
      params.toActionHash !== undefined
        ? Field(params.toActionHash)
        : undefined;

    const actions = await network.fetchActions(address, {
      fromActionState: Field(params.fromActionHash),
      // TODO Somehow endActionState doesn't work on localBlockchain
      //  For now, we can assume this function to be called synchronously so
      //  no further actions after the 'to' have been emitted
      endActionState: this.baseLayer.isLocalBlockChain()
        ? undefined
        : toActionHashField,
    });

    if ("error" in actions) {
      throw new Error(
        `Error ${actions.error.statusCode}: ${actions.error.statusText}`
      );
    }

    const allEvents = await network.fetchEvents(address, undefined, {
      from: UInt32.from(Math.max(params.fromL1BlockHeight - 5, 0)),
    });

    const eventIndex = this.incomingMessageEventIndex();
    const events = allEvents
      .flatMap((x) => x.events)
      .filter((event) => event.data[0].toString() === String(eventIndex))
      .map((event) => ({
        // we need to crop the event data here, since the first field is the event index
        event: {
          data: event.data.slice(1),
          transactionInfo: event.transactionInfo,
        },
        hash: Poseidon.hash(event.data.slice(1).map((x) => Field(x))),
      }));

    const messages = await mapSequential(actions, async (action) => {
      // Find events corresponding to the transaction to get the raw args
      const tx = RuntimeTransaction.fromHashData(
        action.actions[0].map((x) => Field(x))
      );
      const correspondingEvent = events.find((x) =>
        x.hash.equals(tx.argsHash).toBoolean()
      );

      if (correspondingEvent === undefined) {
        throw new Error("Couldn't find events corresponding to action");
      }
      const args = correspondingEvent.event.data;

      return await this.mapActionToTransactions(tx, args);
    });

    // TODO Add check that the endActionHash matches

    return {
      messages,
      from: params.fromActionHash,
      to: params.toActionHash ?? "0",
    };
  }
}
