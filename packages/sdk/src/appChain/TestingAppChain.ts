import { ModulesConfig } from "@proto-kit/common";
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import {
  AccountStateHook,
  BlockProver,
  ProtocolModulesRecord,
  StateTransitionProver,
} from "@proto-kit/protocol";
import {
  VanillaProtocol,
  VanillaProtocolModulesRecord,
  VanillaRuntime,
} from "@proto-kit/library";
import {
  PrivateMempool,
  Sequencer,
  LocalTaskWorkerModule,
  NoopBaseLayer,
  BlockProducerModule,
  ManualBlockTrigger,
  LocalTaskQueue,
  UnprovenProducerModule,
  InMemoryDatabase,
  SequencerModulesRecord,
} from "@proto-kit/sequencer";
import { PrivateKey } from "o1js";

import { StateServiceQueryModule } from "../query/StateServiceQueryModule";
import { InMemorySigner } from "../transaction/InMemorySigner";
import { InMemoryTransactionSender } from "../transaction/InMemoryTransactionSender";
import { BlockStorageNetworkStateModule } from "../query/BlockStorageNetworkStateModule";

import { AppChain, AppChainModulesRecord } from "./AppChain";

export class TestingAppChain<
  RuntimeModules extends RuntimeModulesRecord,
  ProtocolModules extends ProtocolModulesRecord & VanillaProtocolModulesRecord,
  SequencerModules extends SequencerModulesRecord
> extends AppChain<
  RuntimeModules,
  ProtocolModules,
  SequencerModules,
  AppChainModulesRecord
> {
  public static fromRuntime<
    RuntimeModules extends RuntimeModulesRecord
  >(definition: { modules: RuntimeModules }) {
    const runtime = VanillaRuntime.from({
      ...definition.modules,
    });

    const sequencer = Sequencer.from({
      modules: {
        Database: InMemoryDatabase,
        Mempool: PrivateMempool,
        LocalTaskWorkerModule,
        BaseLayer: NoopBaseLayer,
        BlockProducerModule,
        UnprovenProducerModule,
        BlockTrigger: ManualBlockTrigger,
        TaskQueue: LocalTaskQueue,
      },
    });

    const appChain = new TestingAppChain({
      runtime,
      protocol: VanillaProtocol.create(),
      sequencer,

      modules: {
        Signer: InMemorySigner,
        TransactionSender: InMemoryTransactionSender,
        QueryTransportModule: StateServiceQueryModule,
        NetworkStateTransportModule: BlockStorageNetworkStateModule,
      },
    });

    appChain.configurePartial({
      Runtime: {
        Balances: {},
      },

      Sequencer: {
        Database: {},
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
        AccountState: {},
        BlockProver: {},
        StateTransitionProver: {},
        BlockHeight: {},

        TransactionFee: {
          baseFee: 1_000_000n,
          perWeightUnitFee: 1000n,
          methods: {},
        },
      },

      Signer: {},
      TransactionSender: {},
      QueryTransportModule: {},
      NetworkStateTransportModule: {},
    });

    return appChain;
  }

  public setSigner(signer: PrivateKey) {
    const inMemorySigner = this.resolveOrFail("Signer", InMemorySigner);
    inMemorySigner.config.signer = signer;
  }

  public async produceBlock() {
    const blockTrigger = this.sequencer.resolveOrFail(
      "BlockTrigger",
      ManualBlockTrigger
    );

    return await blockTrigger.produceUnproven(true);
  }
}
