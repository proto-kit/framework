import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModulesRecord,
} from "@proto-kit/protocol";
import {
  VanillaRuntimeModules,
  VanillaProtocolModules,
  InMemorySequencerModules,
  VanillaRuntimeModulesRecord,
  MinimalBalances,
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
import { TypedClass } from "@proto-kit/common";
import { PrivateKey } from "o1js";

import { StateServiceQueryModule } from "../query/StateServiceQueryModule";
import { InMemorySigner } from "../transaction/InMemorySigner";
import { InMemoryTransactionSender } from "../transaction/InMemoryTransactionSender";
import { BlockStorageNetworkStateModule } from "../query/BlockStorageNetworkStateModule";

import { AppChain, AppChainModulesRecord } from "./AppChain";

export type TestingSequencerModulesRecord = {
  Database: typeof InMemoryDatabase;
  Mempool: typeof PrivateMempool;
  LocalTaskWorkerModule: typeof LocalTaskWorkerModule;
  BaseLayer: typeof NoopBaseLayer;
  BlockProducerModule: typeof BlockProducerModule;
  UnprovenProducerModule: typeof UnprovenProducerModule;
  BlockTrigger: typeof ManualBlockTrigger;
  TaskQueue: typeof LocalTaskQueue;
};

// ensures we can override vanilla runtime modules type safely
// Partial<VanillaRuntimeModulesRecord> did not work (idk why)
// exporting the same type as below from library also didnt work
// (the type check had no effect)
export type PartialVanillaRuntimeModulesRecord = {
  Balances?: TypedClass<MinimalBalances>;
};

export const randomFeeRecipient = PrivateKey.random().toPublicKey().toBase58();

export class TestingAppChain<
  RuntimeModules extends RuntimeModulesRecord & VanillaRuntimeModulesRecord,
  ProtocolModules extends ProtocolModulesRecord &
    MandatoryProtocolModulesRecord,
  SequencerModules extends SequencerModulesRecord,
  AppChainModules extends AppChainModulesRecord,
> extends AppChain<
  RuntimeModules,
  ProtocolModules,
  SequencerModules,
  AppChainModules
> {
  public static fromRuntime<
    RuntimeModules extends RuntimeModulesRecord &
      PartialVanillaRuntimeModulesRecord,
  >(runtimeModules: RuntimeModules) {
    const appChain = new TestingAppChain({
      Runtime: Runtime.from({
        modules: VanillaRuntimeModules.with(runtimeModules),
      }),
      Protocol: Protocol.from({
        modules: VanillaProtocolModules.with({}),
      }),
      Sequencer: Sequencer.from({
        modules: InMemorySequencerModules.with({}),
      }),
      modules: {
        Signer: InMemorySigner,
        TransactionSender: InMemoryTransactionSender,
        QueryTransportModule: StateServiceQueryModule,
        NetworkStateTransportModule: BlockStorageNetworkStateModule,
      },
    });

    appChain.configurePartial({
      Protocol: {
        AccountState: {},
        BlockProver: {},
        StateTransitionProver: {},
        BlockHeight: {},
        LastStateRoot: {},
        TransactionFee: {
          tokenId: 0n,
          feeRecipient: randomFeeRecipient,
          baseFee: 0n,
          perWeightUnitFee: 0n,
          methods: {},
        },
      },
      Sequencer: {
        Database: {},
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {
          StateTransitionTask: {},
          RuntimeProvingTask: {},
          StateTransitionReductionTask: {},
          BlockReductionTask: {},
          BlockProvingTask: {},
          BlockBuildingTask: {},
        },
        BaseLayer: {},
        UnprovenProducerModule: {},
        TaskQueue: {
          simulatedDuration: 0,
        },
      },
      Signer: {
        signer: PrivateKey.random(),
      },
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

    return await blockTrigger.produceUnproven();
  }
}
