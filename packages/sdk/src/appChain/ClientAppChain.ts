import { log, ModulesConfig } from "@proto-kit/common";
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import {
  AccountStateModule,
  BlockProver,
  StateTransitionProver,
  VanillaProtocol,
} from "@proto-kit/protocol";
import { Sequencer } from "@proto-kit/sequencer";

import { GraphqlClient } from "../graphql/GraphqlClient";
import { GraphqlQueryTransportModule } from "../graphql/GraphqlQueryTransportModule";
import { GraphqlTransactionSender } from "../graphql/GraphqlTransactionSender";
import { AuroSigner } from "../transaction/AuroSigner";

import { AppChain, AppChainModulesRecord } from "./AppChain";

// eslint-disable-next-line etc/prefer-interface
type TestAppChainProtocolModules = {
  StateTransitionProver: typeof StateTransitionProver;
  BlockProver: typeof BlockProver;
  AccountState: typeof AccountStateModule;
}

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

      protocol: VanillaProtocol.from(
        { AccountState: AccountStateModule },
        {
          AccountState: {},
          BlockProver: {},
          StateTransitionProver: {},
        }
      ),

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
