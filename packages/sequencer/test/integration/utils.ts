import { Field, PrivateKey, UInt64 } from "o1js";
import { ArgumentTypes } from "@proto-kit/common";
import {
  MethodIdResolver,
  MethodParameterEncoder,
  Runtime,
} from "@proto-kit/module";

import {
  StateRecord,
  UnsignedTransaction,
  UntypedStateTransition,
} from "../../src";

export function createTransaction(spec: {
  runtime: Runtime<any>;
  privateKey: PrivateKey;
  method: [string, string];
  args: ArgumentTypes;
  nonce: number;
}) {
  const methodId = spec.runtime.dependencyContainer
    .resolve<MethodIdResolver>("MethodIdResolver")
    .getMethodId(spec.method[0], spec.method[1]);

  const decoder = MethodParameterEncoder.fromMethod(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    spec.runtime.resolve(spec.method[0]),
    spec.method[1]
  );
  const { argsFields, argsJSON } = decoder.encode(spec.args);

  return new UnsignedTransaction({
    methodId: Field(methodId),
    argsFields,
    argsJSON,
    sender: spec.privateKey.toPublicKey(),
    nonce: UInt64.from(spec.nonce),
    isMessage: false,
  }).sign(spec.privateKey);
}

export function collectStateDiff(
  stateTransitions: UntypedStateTransition[]
): StateRecord {
  return stateTransitions.reduce<Record<string, Field[] | undefined>>(
    (state, st) => {
      state[st.path.toString()] = st.toValue.value;
      return state;
    },
    {}
  );
}
