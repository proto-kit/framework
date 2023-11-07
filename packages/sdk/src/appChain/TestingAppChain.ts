import { ModulesConfig } from "@proto-kit/common";
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
  UnprovenProducerModule
} from "@proto-kit/sequencer";
import { PrivateKey } from "o1js";
import { StateServiceQueryModule } from "../query/StateServiceQueryModule";
import { InMemorySigner } from "../transaction/InMemorySigner";
import { InMemoryTransactionSender } from "../transaction/InMemoryTransactionSender";
import { AppChain, AppChainModulesRecord } from "./AppChain";

type TestAppChainProtocolModules = {
  StateTransitionProver: typeof StateTransitionProver;
  BlockProver: typeof BlockProver;
  // AccountStateModule: typeof AccountStateModule;
};

export class TestingAppChain<
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
      modules: {
        Mempool: PrivateMempool,
        LocalTaskWorkerModule,
        BaseLayer: NoopBaseLayer,
        BlockProducerModule,
        UnprovenProducerModule,
        BlockTrigger: ManualBlockTrigger,
        TaskQueue: LocalTaskQueue,
      },

      config: {
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {},
        BaseLayer: {},
        UnprovenProducerModule: {},

        TaskQueue: {
          simulatedDuration: 0,
        },
      },
    });

    const appchain = new TestingAppChain({
      runtime,
      sequencer,

      protocol: VanillaProtocol.from(
        {
          // AccountStateModule
        },
        {
          BlockProver: {},
          StateTransitionProver: {}
        },
      ),

      modules: {
        Signer: InMemorySigner,
        TransactionSender: InMemoryTransactionSender,
        QueryTransportModule: StateServiceQueryModule,
      }
    });

    appchain.configure({
      Runtime: definition.config,

      Sequencer: {
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {},
        BaseLayer: {},
        UnprovenProducerModule: {},

        TaskQueue: {
          simulatedDuration: 0,
        },
      },

      Protocol: {
        BlockProver: {},
        StateTransitionProver: {},
      },

      Signer: {},
      TransactionSender: {},
      QueryTransportModule: {},
    });

    return appchain;
  }

  public setSigner(signer: PrivateKey) {
    this.configure({
      Signer: {
        signer,
      },

      TransactionSender: {},
      QueryTransportModule: {},
      Runtime: {},
      Protocol: {},
      Sequencer: {}
    });
  }
  //
  // public useAuroSigner() {
  //   this.registerModules({
  //     Signer: AuroSigner,
  //   });
  // }

  public async produceBlock() {
    const blockTrigger = this.sequencer.resolveOrFail(
      "BlockTrigger",
      ManualBlockTrigger
    );

    return await blockTrigger.produceUnproven(true);
  }
}
