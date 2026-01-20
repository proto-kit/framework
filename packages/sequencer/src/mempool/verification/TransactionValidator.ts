import { inject, injectable } from "tsyringe";
import {
  MethodParameterEncoder,
  Runtime,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import { Signature } from "o1js";

import { PendingTransaction, UnsignedTransaction } from "../PendingTransaction";

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
      tx.methodId
    );

    if (methodPath === undefined) {
      return `Method with id ${tx.methodId} does not exist`;
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

  public validateTx(tx: PendingTransaction): [boolean, string | undefined] {
    const methodError = this.validateMethod(tx);

    if (methodError !== undefined) {
      return [false, methodError];
    }

    const signature = Signature.fromJSON(tx.signature);
    const runtimeTx = tx.toRuntimeTransaction();

    const validSignature = signature.verify(runtimeTx.sender.value, [
      runtimeTx.methodId,
      ...runtimeTx.nonce.value.value.toFields(),
      runtimeTx.argsHash,
    ]);

    if (!validSignature.toBoolean()) {
      return [false, "Signature provided is not valid"];
    }

    return [true, undefined];
  }
}
