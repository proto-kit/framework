/* eslint-disable @typescript-eslint/consistent-type-assertions */
import {
  ModuleContainer,
  ModulesConfig,
  ModulesRecord,
  TypedClass,
} from "@proto-kit/common";
import {
  Runtime,
  RuntimeModule,
  RuntimeModulesRecord,
  MethodIdResolver,
} from "@proto-kit/module";
import {
  BlockStorage,
  Sequencer,
  SequencerModulesRecord,
  UnsignedTransaction,
} from "@proto-kit/sequencer";
import {
  NetworkState,
  Protocol,
  ProtocolModulesRecord,
  RuntimeTransaction,
  RuntimeMethodExecutionContext,
  StateTransitionWitnessProviderReference,
  ProtocolModule,
} from "@proto-kit/protocol";
import { container } from "tsyringe";
import { Field, PublicKey, UInt64 } from "snarkyjs";
import { AppChainTransaction } from "../transaction/AppChainTransaction";
import { AppChainModule } from "./AppChainModule";
import { Signer } from "../transaction/InMemorySigner";
import { TransactionSender } from "../transaction/InMemoryTransactionSender";
import { QueryBuilderFactory, Query } from "../query/QueryBuilderFactory";
import {
  QueryTransportModule,
  StateServiceQueryModule,
} from "../query/StateServiceQueryModule";

import { NetworkStateQuery } from "../query/NetworkStateQuery";
import { AreProofsEnabledFactory } from "./AreProofsEnabledFactory";

export type AppChainModulesRecord = ModulesRecord<
  TypedClass<AppChainModule<unknown>>
>;

export interface AppChainDefinition<
  RuntimeModules extends RuntimeModulesRecord,
  ProtocolModules extends ProtocolModulesRecord,
  SequencerModules extends SequencerModulesRecord,
  AppChainModules extends AppChainModulesRecord
> {
  runtime: TypedClass<Runtime<RuntimeModules>>;
  protocol: TypedClass<Protocol<ProtocolModules>>;
  sequencer: TypedClass<Sequencer<SequencerModules>>;
  modules: AppChainModules;
  config?: ModulesConfig<AppChainModules>;
}

export type ExpandAppChainModules<
  RuntimeModules extends RuntimeModulesRecord,
  ProtocolModules extends ProtocolModulesRecord,
  SequencerModules extends SequencerModulesRecord,
  AppChainModules extends AppChainModulesRecord
> = {
  Runtime: TypedClass<Runtime<RuntimeModules>>;
  Protocol: TypedClass<Protocol<ProtocolModules>>;
  Sequencer: TypedClass<Sequencer<SequencerModules>>;
} & AppChainModules;

export type ExpandAppChainDefinition<
  RuntimeModules extends RuntimeModulesRecord,
  ProtocolModules extends ProtocolModulesRecord,
  SequencerModules extends SequencerModulesRecord,
  AppChainModules extends AppChainModulesRecord
> = {
  modules: ExpandAppChainModules<
    RuntimeModules,
    ProtocolModules,
    SequencerModules,
    AppChainModules
  >;
  config?: ModulesConfig<
    ExpandAppChainModules<
      RuntimeModules,
      ProtocolModules,
      SequencerModules,
      AppChainModules
    >
  >;
};

/**
 * Definition of required arguments for AppChain
 */
export interface AppChainConfig<
  RuntimeModules extends RuntimeModulesRecord,
  ProtocolModules extends ProtocolModulesRecord,
  SequencerModules extends SequencerModulesRecord,
  AppChainModules extends AppChainModulesRecord
> {
  runtime: ModulesConfig<RuntimeModules>;
  protocol: ModulesConfig<ProtocolModules>;
  sequencer: ModulesConfig<SequencerModules>;
  appChain: ModulesConfig<AppChainModules>;
}

/**
 * AppChain acts as a wrapper connecting Runtime, Protocol and Sequencer
 */
export class AppChain<
  RuntimeModules extends RuntimeModulesRecord,
  ProtocolModules extends ProtocolModulesRecord,
  SequencerModules extends SequencerModulesRecord,
  AppChainModules extends AppChainModulesRecord
> extends ModuleContainer<
  ExpandAppChainModules<
    RuntimeModules,
    ProtocolModules,
    SequencerModules,
    AppChainModules
  >
> {
  // alternative AppChain constructor
  public static from<
    RuntimeModules extends RuntimeModulesRecord,
    ProtocolModules extends ProtocolModulesRecord,
    SequencerModules extends SequencerModulesRecord,
    AppChainModules extends AppChainModulesRecord
  >(
    definition: AppChainDefinition<
      RuntimeModules,
      ProtocolModules,
      SequencerModules,
      AppChainModules
    >
  ) {
    return new AppChain(definition);
  }

  public definition: ExpandAppChainDefinition<
    RuntimeModules,
    ProtocolModules,
    SequencerModules,
    AppChainModules
  >;

  public constructor(
    definition: AppChainDefinition<
      RuntimeModules,
      ProtocolModules,
      SequencerModules,
      AppChainModules
    >
  ) {
    const expandedDefinition: ExpandAppChainDefinition<
      RuntimeModules,
      ProtocolModules,
      SequencerModules,
      AppChainModules
    > = {
      modules: {
        Runtime: definition.runtime,
        Sequencer: definition.sequencer,
        Protocol: definition.protocol,
        ...definition.modules,
      },
      config: {
        Runtime: {},
        Sequencer: {},
        Protocol: {},
        ...definition.config,
      } as ModulesConfig<
        ExpandAppChainModules<
          RuntimeModules,
          ProtocolModules,
          SequencerModules,
          AppChainModules
        >
      >,
    };
    super(expandedDefinition);
    this.definition = expandedDefinition;
  }

  public get query(): {
    runtime: Query<RuntimeModule<unknown>, RuntimeModules>;
    protocol: Query<ProtocolModule, ProtocolModules>;
    network: NetworkStateQuery;
  } {
    const queryTransportModule = this.resolveOrFail(
      "QueryTransportModule",
      StateServiceQueryModule
    );

    const network = new NetworkStateQuery(
      this.sequencer.dependencyContainer.resolve<BlockStorage>("BlockStorage")
    );

    return {
      runtime: QueryBuilderFactory.fromRuntime(
        this.resolveOrFail("Runtime", Runtime<RuntimeModules>),
        queryTransportModule
      ),

      protocol: QueryBuilderFactory.fromProtocol(
        this.resolveOrFail("Runtime", Protocol<ProtocolModules>),
        queryTransportModule
      ),

      network,
    };
  }

  public get runtime(): Runtime<RuntimeModules> {
    return this.resolve("Runtime");
  }

  public get sequencer(): Sequencer<SequencerModules> {
    return this.resolve("Sequencer");
  }

  public get protocol(): Protocol<ProtocolModules> {
    return this.resolve("Protocol");
  }

  public configureAll(
    config: AppChainConfig<
      RuntimeModules,
      ProtocolModules,
      SequencerModules,
      AppChainModules
    >
  ): void {
    this.runtime.configure(config.runtime);
    this.sequencer.configure(config.sequencer);
    this.protocol.configure(config.protocol);
    this.configure({
      Runtime: {},
      Sequencer: {},
      Protocol: {},
      ...config.appChain,
    } as Parameters<typeof this.configure>[0]);
  }

  public transaction(
    sender: PublicKey,
    callback: () => void,
    options?: { nonce?: number }
  ) {
    const executionContext = container.resolve<RuntimeMethodExecutionContext>(
      RuntimeMethodExecutionContext
    );

    executionContext.setup({
      transaction: {
        sender,
        nonce: UInt64.from(options?.nonce ?? 0),
        argsHash: Field(0),
      } as unknown as RuntimeTransaction,

      networkState: {
        block: {
          height: UInt64.from(0),
        },
      } as unknown as NetworkState,
    });

    callback();

    const { methodName, moduleName, args } = executionContext.current().result;

    // TODO: extract error
    if (!methodName || !moduleName || !args) {
      throw new Error(
        "Unable to determine moduleName, methodName or args for the transaction"
      );
    }

    const argsFields = args.flatMap((arg) => arg.toFields());
    const unsignedTransaction = new UnsignedTransaction({
      methodId: Field(
        this.runtime.dependencyContainer
          .resolve<MethodIdResolver>("MethodIdResolver")
          .getMethodId(moduleName, methodName)
      ),
      args: argsFields,
      nonce: UInt64.from(options?.nonce ?? 0),
      sender,
    });

    const signer = this.container.resolve<Signer>("Signer");
    const transactionSender =
      this.container.resolve<TransactionSender>("TransactionSender");

    const transaction = new AppChainTransaction(signer, transactionSender);

    transaction.withUnsignedTransaction(unsignedTransaction);

    return transaction;
  }

  /**
   * Starts the appchain and cross-registers runtime to sequencer
   */
  public async start() {
    super.create(() => container);

    // These three statements are crucial for dependencies inside any of these
    // components to access their siblings inside their constructor.
    // This is because when it is the first time they are resolved, create()
    // will not be called until after the constructor finished because of
    // how tsyringe handles hooks
    this.resolve("Runtime");
    this.resolve("Protocol");
    this.resolve("Sequencer");

    this.registerDependencyFactories([AreProofsEnabledFactory]);

    // Workaround to get protocol and sequencer to have
    // access to the same WitnessProviderReference
    const reference = new StateTransitionWitnessProviderReference();
    this.registerValue({
      StateTransitionWitnessProviderReference: reference,
    });

    // this.runtime.start();
    await this.sequencer.start();
  }
}
