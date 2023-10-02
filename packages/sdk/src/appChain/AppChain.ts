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
  sequencer: ModulesConfig<SequencerModules>;
  protocol: ModulesConfig<ProtocolModules>;
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
> extends ModuleContainer<AppChainModules> {
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

  public constructor(
    public definition: AppChainDefinition<
      RuntimeModules,
      ProtocolModules,
      SequencerModules,
      AppChainModules
    >
  ) {
    super(definition);
    this.registerClasses({
      Runtime: this.definition.runtime,
      Protocol: this.definition.protocol,
      Sequencer: this.definition.sequencer,
    });
    this.registerDependencyFactories([AreProofsEnabledFactory]);
  }

  public get runtime(): Runtime<RuntimeModules> {
    return this.resolveOrFail<Runtime<RuntimeModules>>(
      "Runtime",
      Runtime<RuntimeModules>
    );
  }

  public get sequencer(): Sequencer<SequencerModules> {
    return this.resolveOrFail<Sequencer<SequencerModules>>(
      "Sequencer",
      Sequencer<SequencerModules>
    );
  }

  public get protocol(): Protocol<ProtocolModules> {
    return this.resolveOrFail<Protocol<ProtocolModules>>(
      "Protocol",
      Protocol<ProtocolModules>
    );
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
    this.configure(config.appChain);
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
    super.start(() => container);
    // this.registerValue({
    //   Sequencer: this.definition.sequencer,
    //   Runtime: this.definition.runtime,
    //   Protocol: this.definition.protocol,
    // });
    this.registerDependencyFactories([AreProofsEnabledFactory]);

    // TODO Remove?
    // I think the best solution would be to make AreProofsEnabled a module, therefore we dont have to inject the modulecontainer anywhere (which is a antipattern)
    [this.runtime, this.protocol, this.sequencer].forEach((container) => {
      container.registerValue({ AppChain: this });
    });

    // Workaround to get protocol and sequencer to have
    // access to the same WitnessProviderReference
    const reference = new StateTransitionWitnessProviderReference();
    this.registerValue({
      StateTransitionWitnessProviderReference: reference,
    });

    // this.runtime.start();
    // await this.sequencer.start();
  }
}
