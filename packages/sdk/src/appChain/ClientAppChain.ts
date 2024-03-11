import { log, ModulesConfig } from "@proto-kit/common";
import {
  InMemoryStateService,
  Runtime,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import {
  AccountStateModule,
  BlockProver,
  Protocol,
  ProtocolModulesRecord,
  StateServiceProvider,
  StateTransitionProver,
  VanillaProtocol,
} from "@proto-kit/protocol";
import {
  PrivateMempool,
  Sequencer,
  LocalTaskWorkerModule,
  NoopBaseLayer,
  BlockProducerModule,
  ManualBlockTrigger,
  LocalTaskQueue,
  SequencerModulesRecord,
} from "@proto-kit/sequencer";
import { PrivateKey } from "o1js";
import { GraphqlClient } from "../graphql/GraphqlClient";
import { GraphqlQueryTransportModule } from "../graphql/GraphqlQueryTransportModule";
import { GraphqlNetworkStateTransportModule } from "../graphql/GraphqlNetworkStateTransportModule";
import { GraphqlTransactionSender } from "../graphql/GraphqlTransactionSender";
import { StateServiceQueryModule } from "../query/StateServiceQueryModule";
import { AuroSigner } from "../transaction/AuroSigner";
import { InMemorySigner } from "../transaction/InMemorySigner";
import { InMemoryTransactionSender } from "../transaction/InMemoryTransactionSender";
import { AppChain, AppChainModulesRecord } from "./AppChain";
import { container } from "tsyringe";

export class ClientAppChain<
  RuntimeModules extends RuntimeModulesRecord
> extends AppChain<
  RuntimeModules,
  ProtocolModulesRecord,
  SequencerModulesRecord,
  AppChainModulesRecord
> {
  public static fromRuntime<
    RuntimeModules extends RuntimeModulesRecord
  >(definition: { modules: RuntimeModules }) {
    const runtime = Runtime.from({
      ...definition,
    });

    const sequencer = Sequencer.from({
      modules: {},
    });

    const appChain = new ClientAppChain({
      runtime,
      sequencer,
      protocol: VanillaProtocol.from({}),

      modules: {
        GraphqlClient,
        Signer: AuroSigner,
        TransactionSender: GraphqlTransactionSender,
        QueryTransportModule: GraphqlQueryTransportModule,
        NetworkStateTransportModule: GraphqlNetworkStateTransportModule,
      },
    });

    appChain.configure({
      Protocol: {
        BlockProver: {},
        StateTransitionProver: {},
        AccountState: {},
        BlockHeight: {},
        LastStateRoot: {},
      },

      Signer: {},
      TransactionSender: {},
      QueryTransportModule: {},
      NetworkStateTransportModule: {},

      GraphqlClient: {
        url: "http://127.0.0.1:8080/graphql",
      },
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

  public async start() {
    log.setLevel("ERROR");
    await super.start();
  }
}
