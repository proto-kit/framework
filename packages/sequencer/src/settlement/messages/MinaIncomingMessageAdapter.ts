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
import { EMPTY_PUBLICKEY } from "@proto-kit/common";
import { RuntimeTransaction } from "@proto-kit/protocol";

import { PendingTransaction } from "../../mempool/PendingTransaction";
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
    @inject("Runtime") private readonly runtime: Runtime<RuntimeModulesRecord>
  ) {}

  private mapActionToTransactions(
    tx: RuntimeTransaction,
    fieldArgs: Field[]
  ): PendingTransaction {
    const { methodId } = tx;

    const methodPointer = this.runtime.methodIdResolver.getMethodNameFromId(
      methodId.toBigInt()
    );

    if (methodPointer === undefined) {
      throw new Error(`Runtime method with methodId ${methodId} doesn't exist`);
    }

    const [moduleName, methodName] = methodPointer;
    const module = this.runtime.resolve(moduleName);
    const methodEncoder = MethodParameterEncoder.fromMethod(module, methodName);

    const args = methodEncoder.decodeFields(fieldArgs);

    const { argsJSON, argsFields } = methodEncoder.encode(args);

    return new PendingTransaction({
      methodId,
      sender: EMPTY_PUBLICKEY,
      nonce: UInt64.zero,
      signature: Signature.create(PrivateKey.random(), [Field(0)]),
      argsJSON,
      argsFields,
      isMessage: true,
    });
  }

  public async getPendingMessages(
    address: PublicKey,
    params: {
      fromActionHash: string;
      toActionHash?: string;
      fromL1Block: number;
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

    const actions = await network.fetchActions(address, {
      fromActionState: Field(params.fromActionHash),
      // TODO Somehow that doesn't work on localBlockchain
      // endActionState: params.toActionHash
      //   ? Field(params.toActionHash)
      //   : undefined,
    });

    const events = await network.fetchEvents(address, undefined, {
      from: UInt32.from(Math.max(params.fromL1Block - 5, 0)),
    });

    if ("error" in actions) {
      throw new Error(
        `Error ${actions.error.statusCode}: ${actions.error.statusText}`
      );
    }

    const messages = actions.map((action) => {
      // Find events corresponding to the transaction to get the raw args
      const tx = RuntimeTransaction.fromHashData(
        action.actions[0].map((x) => Field(x))
      );
      const correspondingEvent = events
        .map((event) => {
          return event.events.find((event2) => {
            return Poseidon.hash(event2.data.map((x) => Field(x))).equals(
              tx.argsHash
            );
          });
        })
        .find((x) => x !== undefined);

      if (correspondingEvent === undefined) {
        throw new Error("Couldn't find events corresponding to action");
      }
      const args = correspondingEvent.data.map((x) => Field(x));

      return this.mapActionToTransactions(tx, args);
    });

    return {
      messages,
      from: params.fromActionHash,
      to: params.toActionHash ?? "0",
    };
  }
}
