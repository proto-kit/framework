import { ModuleContainer, TypedClass } from "@proto-kit/common";
import {
  InMemoryStateService,
  MethodIdResolver,
  MethodParameterEncoder,
  Runtime,
  RuntimeModule,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import {
  MandatoryProtocolModulesRecord,
  ProvableNetworkState,
  Protocol,
  ProtocolModule,
  ProtocolModulesRecord,
  RuntimeMethodExecutionContext,
  RuntimeTransaction,
  StateServiceProvider,
} from "@proto-kit/protocol";
import {
  DummyStateService,
  Query,
  Sequencer,
  UnsignedTransaction,
  AppChain,
  AppChainModule,
  MinimalAppChainDefinition,
} from "@proto-kit/sequencer";
import { container } from "tsyringe";
import { Field, PublicKey, UInt64 } from "o1js";

import { GraphqlClient } from "../graphql/GraphqlClient";
import { GraphqlQueryTransportModule } from "../graphql/GraphqlQueryTransportModule";
import { GraphqlNetworkStateTransportModule } from "../graphql/GraphqlNetworkStateTransportModule";
import { GraphqlTransactionSender } from "../graphql/GraphqlTransactionSender";
import { Signer } from "../transaction/InMemorySigner";
import { AppChainTransaction } from "../transaction/AppChainTransaction";
import { TransactionSender } from "../transaction/InMemoryTransactionSender";
import { QueryService } from "../query/QueryService";

export type InferModules<Container extends TypedClass<ModuleContainer<any>>> =
  Container extends TypedClass<infer Type>
    ? Type extends ModuleContainer<infer Modules>
      ? Modules
      : never
    : never;

export class ClientAppChain<
  AppChainModules extends MinimalAppChainDefinition,
> extends AppChain<AppChainModules> {
  public static from<Modules extends MinimalAppChainDefinition>(
    definition: Modules
  ) {
    return new ClientAppChain(definition);
  }

  public static fromRemoteEndpoint<
    RuntimeModules extends RuntimeModulesRecord,
    ProtocolModules extends ProtocolModulesRecord &
      MandatoryProtocolModulesRecord,
    SignerType extends Signer & AppChainModule<unknown>,
  >(
    runtime: TypedClass<Runtime<RuntimeModules>>,
    protocol: TypedClass<Protocol<ProtocolModules>>,
    signer: TypedClass<SignerType>
  ) {
    const appChain = new ClientAppChain({
      Runtime: runtime,
      Protocol: protocol,
      Sequencer: Sequencer.from({}),

      GraphqlClient,
      Signer: signer,
      TransactionSender: GraphqlTransactionSender,
      QueryTransportModule: GraphqlQueryTransportModule,
      NetworkStateTransportModule: GraphqlNetworkStateTransportModule,
    });

    appChain.configurePartial({
      Sequencer: {},

      Signer: {},
      TransactionSender: {},
      QueryTransportModule: {},
      NetworkStateTransportModule: {},
    });

    /**
     * Register state service provider globally,
     * to avoid providing an entire sequencer.
     *
     * Alternatively we could register the state service provider
     * in runtime's container, but i think the event emitter proxy
     * instantiates runtime/runtime modules before we can register
     * the mock state service provider.
     */
    const stateServiceProvider = new StateServiceProvider();
    stateServiceProvider.setCurrentStateService(new InMemoryStateService());
    container.registerInstance("StateServiceProvider", stateServiceProvider);

    return appChain;
  }

  public async transaction(
    sender: PublicKey,
    callback: () => Promise<void>,
    options?: { nonce?: number }
  ): Promise<AppChainTransaction> {
    const executionContext = container.resolve<RuntimeMethodExecutionContext>(
      RuntimeMethodExecutionContext
    );

    executionContext.setup({
      transaction: RuntimeTransaction.dummyTransaction(),
      networkState: ProvableNetworkState.empty(),
    });
    executionContext.setSimulated(true);

    const stateServiceProvider = this.container.resolve<StateServiceProvider>(
      "StateServiceProvider"
    );
    stateServiceProvider.setCurrentStateService(new DummyStateService());

    await callback();

    stateServiceProvider.popCurrentStateService();

    const { methodName, moduleName, args } = executionContext.current().result;

    // TODO: extract error
    if (
      methodName === undefined ||
      moduleName === undefined ||
      args === undefined
    ) {
      throw new Error(
        "Unable to determine moduleName, methodName or args for the transaction"
      );
    }

    const runtimeModule = this.runtime.resolveOrFail<RuntimeModule>(moduleName);

    const encoder = MethodParameterEncoder.fromMethod(
      runtimeModule,
      methodName
    );

    const { fields, auxiliary } = encoder.encode(args);

    const retrieveNonce = async (publicKey: PublicKey) => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const query = this.query.protocol as Query<
        ProtocolModule<unknown>,
        MandatoryProtocolModulesRecord
      >;
      const accountState = await query.AccountState.accountState.get(publicKey);
      return accountState?.nonce;
    };

    const nonce =
      options?.nonce !== undefined
        ? UInt64.from(options.nonce)
        : (await retrieveNonce(sender)) ?? UInt64.from(0);

    const unsignedTransaction = new UnsignedTransaction({
      methodId: Field(
        this.runtime.dependencyContainer
          .resolve<MethodIdResolver>("MethodIdResolver")
          .getMethodId(moduleName, methodName)
      ),

      argsFields: fields,
      auxiliaryData: auxiliary,
      nonce,
      sender,
      isMessage: false,
    });

    const signer = this.container.resolve<Signer>("Signer");
    const transactionSender =
      this.container.resolve<TransactionSender>("TransactionSender");

    const transaction = new AppChainTransaction(signer, transactionSender);

    transaction.withUnsignedTransaction(unsignedTransaction);

    return transaction;
  }

  public get query(): QueryService<
    InferModules<AppChainModules["Runtime"]>,
    InferModules<AppChainModules["Protocol"]>
  > {
    return this.container.resolve<
      QueryService<
        InferModules<AppChainModules["Runtime"]>,
        InferModules<AppChainModules["Protocol"]>
      >
    >(QueryService);
  }
}
