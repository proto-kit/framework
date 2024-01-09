import { log, ModulesConfig } from "@proto-kit/common";
import {
  InMemoryStateService,
  Runtime,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import {
  AccountStateModule,
  BlockProver,
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
} from "@proto-kit/sequencer";
import { PrivateKey } from "o1js";
import { GraphqlClient } from "../graphql/GraphqlClient";
import { GraphqlQueryTransportModule } from "../graphql/GraphqlQueryTransportModule";
import { GraphqlTransactionSender } from "../graphql/GraphqlTransactionSender";
import { StateServiceQueryModule } from "../query/StateServiceQueryModule";
import { AuroSigner } from "../transaction/AuroSigner";
import { InMemorySigner } from "../transaction/InMemorySigner";
import { InMemoryTransactionSender } from "../transaction/InMemoryTransactionSender";
import { AppChain, AppChainModulesRecord } from "./AppChain";

type TestAppChainProtocolModules = {
  StateTransitionProver: typeof StateTransitionProver;
  BlockProver: typeof BlockProver;
  AccountState: typeof AccountStateModule;
};

export class ClientAppChain<
  RuntimeModules extends RuntimeModulesRecord
> extends AppChain<
  RuntimeModules,
  TestAppChainProtocolModules,
  any,
  AppChainModulesRecord
> {
  public static fromRuntime<
    RuntimeModules extends RuntimeModulesRecord
  >(definition: {
    modules: RuntimeModules;
    config: ModulesConfig<RuntimeModules>;
  }) {
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
      },
    });

    appChain.configure({
      Runtime: definition.config,

      Sequencer: {
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {},
        BaseLayer: {},

        TaskQueue: {
          simulatedDuration: 0,
        },
      },

      Protocol: {
        BlockProver: {},
        StateTransitionProver: {},
        AccountState: {},
      },

      Signer: {},
      TransactionSender: {},
      QueryTransportModule: {},

      GraphqlClient: {
        url: "http://127.0.0.1:8080/graphql",
      },
    });

    return appChain;
  }

  public async start() {
    log.setLevel("ERROR");
    await super.start();
  }
}
