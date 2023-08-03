import {
  AreProofsEnabled,
  ModuleContainer,
  ModulesConfig,
  ModulesRecord,
  TypedClass,
} from "@yab/common";
import {
  Runtime,
  RuntimeMethodExecutionContext,
  RuntimeModulesRecord,
} from "@yab/module";
import { dependency, Sequencer, SequencerModulesRecord } from "@yab/sequencer";
import { Protocol, ProtocolModulesRecord } from "@yab/protocol";
import { container } from "tsyringe";
import { UnsignedTransaction } from "@yab/sequencer/dist/mempool/PendingTransaction";
import { Field, PublicKey, UInt64 } from "snarkyjs";
import { AppChainTransaction } from "../transaction/AppChainTransaction";
import { AppChainModule } from "./AppChainModule";
import { Signer } from "../transaction/InMemorySigner";
import { TransactionSender } from "../transaction/InMemoryTransactionSender";
import { StateTransitionWitnessProviderReference } from "@yab/protocol";
import { QueryBuilderFactory } from "../query/QueryBuilderFactory";
import { InMemoryQueryTransportModule } from "./../query/InMemoryQueryTransportModule";

export type AppChainModulesRecord = ModulesRecord<
  TypedClass<AppChainModule<unknown>>
>;

export interface AppChainDefinition<
  RuntimeModules extends RuntimeModulesRecord,
  ProtocolModules extends ProtocolModulesRecord,
  SequencerModules extends SequencerModulesRecord,
  AppChainModules extends AppChainModulesRecord
> {
  runtime: Runtime<RuntimeModules>;
  protocol: Protocol<ProtocolModules>;
  sequencer: Sequencer<SequencerModules>;
  modules: AppChainModules;
  config?: ModulesConfig<AppChainModules>;
}

/**
 * Definition of required arguments for AppChain
 */
export interface AppChainConfig<
  RuntimeModules extends RuntimeModulesRecord,
  SequencerModules extends SequencerModulesRecord,
  ProtocolModules extends ProtocolModulesRecord,
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
  >
  extends ModuleContainer<AppChainModules>
  implements AreProofsEnabled
{
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

  public get query() {
    const queryTransportModule = this.resolveOrFail(
      "QueryTransportModule",
      InMemoryQueryTransportModule
    );

    return QueryBuilderFactory.fromRuntime(
      this.definition.runtime,
      queryTransportModule
    );
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
    this.registerValue({
      Sequencer: this.definition.sequencer,
      Runtime: this.definition.runtime,
      Protocol: this.definition.protocol,
    });
  }

  public get runtime(): Runtime<RuntimeModules> {
    return this.definition.runtime;
  }

  public get sequencer(): Sequencer<SequencerModules> {
    return this.definition.sequencer;
  }

  public get protocol(): Protocol<ProtocolModules> {
    return this.definition.protocol;
  }

  public configureAll(
    config: AppChainConfig<
      RuntimeModules,
      SequencerModules,
      ProtocolModules,
      AppChainModules
    >
  ) {
    this.runtime.configure(config.runtime);
    this.sequencer.configure(config.sequencer);
    this.protocol.configure(config.protocol);
    this.configure(config.appChain);
  }

  public transaction(sender: PublicKey, callback: () => void) {
    const executionContext = container.resolve<RuntimeMethodExecutionContext>(
      RuntimeMethodExecutionContext
    );

    callback();

    const { methodName, moduleName, args } = executionContext.current().result;

    // TODO: extract error
    if (!methodName || !moduleName || !args) {
      throw new Error(
        "Unable to determine moduleName, methodName or args for the transaction"
      );
    }

    const argsFields = args.flatMap((arg) => arg.toFields(arg));
    const unsignedTransaction = new UnsignedTransaction({
      methodId: Field(this.runtime.getMethodId(moduleName, methodName)),
      args: argsFields,
      nonce: UInt64.from(0),
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
    [this.runtime, this.protocol, this.sequencer].forEach((container) => {
      container.registerValue({ AppChain: this });
    });

    this.protocol.registerValue({
      Runtime: this.runtime,
    });

    // Hacky workaround to get protocol and sequencer to have
    // access to the same WitnessProviderReference
    const reference = new StateTransitionWitnessProviderReference();
    this.protocol.dependencyContainer.register(
      "StateTransitionWitnessProviderReference",
      {
        useValue: reference,
      }
    );
    this.sequencer.dependencyContainer.register(
      "StateTransitionWitnessProviderReference",
      {
        useValue: reference,
      }
    );

    this.sequencer.registerValue({
      Runtime: this.runtime,
      Protocol: this.protocol,
    });

    await this.sequencer.start();
  }

  // eslint-disable-next-line no-warning-comments
  // TODO
  private proofsEnabled: boolean = false;

  public get areProofsEnabled(): boolean {
    return this.proofsEnabled;
  }

  public setProofsEnabled(areProofsEnabled: boolean): void {
    this.proofsEnabled = areProofsEnabled;
  }
}
