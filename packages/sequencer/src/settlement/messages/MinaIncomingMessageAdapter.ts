import { inject, injectable } from "tsyringe";
import { Field, PrivateKey, PublicKey, Signature, UInt64 } from "o1js";
import {
  Runtime,
  RuntimeModulesRecord,
  MethodParameterEncoder,
} from "@proto-kit/module";
import { EMPTY_PUBLICKEY } from "@proto-kit/common";

import { PendingTransaction } from "../../mempool/PendingTransaction";
import type { MinaBaseLayer } from "../../protocol/baselayer/MinaBaseLayer";

import { IncomingMessageAdapter } from "./IncomingMessageAdapter";

@injectable()
export class MinaIncomingMessageAdapter implements IncomingMessageAdapter {
  public constructor(
    @inject("BaseLayer")
    private readonly baseLayer: MinaBaseLayer,
    @inject("Runtime") private readonly runtime: Runtime<RuntimeModulesRecord>
  ) {}

  private mapActionToTransactions(action: string[]): PendingTransaction {
    const fields = action.map((s) => Field(s));
    const [methodId] = fields;

    const methodPointer = this.runtime.methodIdResolver.getMethodNameFromId(
      methodId.toBigInt()
    );

    if (methodPointer === undefined) {
      throw new Error(`Runtime method with methodId ${methodId} doesn't exist`);
    }

    const [moduleName, methodName] = methodPointer;
    const module = this.runtime.resolve(moduleName);
    const methodEncoder = MethodParameterEncoder.fromMethod(module, methodName);

    const transactionFieldLength = 4;
    const args = methodEncoder.decodeFields(
      fields.slice(transactionFieldLength)
    );

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
      // endActionState: params.toActionHash
      //   ? Field(params.toActionHash)
      //   : undefined,
    });

    if ("error" in actions) {
      throw new Error(
        `Error ${actions.error.statusCode}: ${actions.error.statusText}`
      );
    }

    const messages = actions.map((action) =>
      this.mapActionToTransactions(action.actions[0])
    );

    return {
      messages,
      from: params.fromActionHash,
      to: params.toActionHash ?? "0",
    };
  }
}
