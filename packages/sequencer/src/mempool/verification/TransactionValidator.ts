import { inject, injectable } from "tsyringe";
import {
  MethodParameterEncoder,
  Runtime,
  RuntimeModulesRecord,
} from "@proto-kit/module";

import {
  PendingTransaction,
} from "../PendingTransaction";
import { Field, Poseidon, PublicKey, Signature, UInt64 } from "o1js";
import { SignedTransaction } from "packages/protocol/dist";

@injectable()
export class TransactionValidator {
  public constructor(
    @inject("Runtime") private readonly runtime: Runtime<RuntimeModulesRecord>
  ) {}

  private validateMethod(tx: PendingTransaction): string | undefined {
    // Check if method exists

    // We don't actually need to use runtime.getMethodById here, bcs the
    // module name validation happens inside getMethodNameFromId
    // and also in the next step
    const methodPath = this.runtime.methodIdResolver.getMethodNameFromId(
      tx.data.methodId
    );

    if (methodPath === undefined) {
      return `Method with id ${tx.data.methodId} does not exist`;
    }

    // Check if parameters are decodable
    const runtimeModule = this.runtime.resolve(methodPath[0]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const encoder = MethodParameterEncoder.fromMethod(
      runtimeModule,
      methodPath[1]
    );

    return undefined;
  }

  public validateTx(
    tx: PendingTransaction
  ): [boolean, string | undefined] {
    const methodError = this.validateMethod(tx);

    if (methodError !== undefined) {
      return [false, methodError];
    }

    const signature = Signature.fromJSON(tx.data.signature)
    const signatureData = SignedTransaction.getSignatureData({
      nonce: UInt64.from(tx.data.nonce),
      methodId: Field(tx.data.methodId),
      argsHash: Poseidon.hash(tx.data.argsFields.map((f) => Field(f))),
    });

    const validSignature = signature.verify(
      PublicKey.fromBase58(tx.data.sender),
      signatureData
    );

    if (!validSignature.toBoolean()) {
      return [false, "Signature provided is not valid"];
    }

    return [true, undefined];
  }
}
