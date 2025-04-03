import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import {
  VanillaRuntimeModules,
  VanillaProtocolModules,
  InMemorySequencerModules,
  MinimalBalances,
} from "@proto-kit/library";
import { TypedClass } from "@proto-kit/common";
import {
  ManualBlockTrigger,
  MinimalAppChainDefinition,
  Sequencer,
  VanillaTaskWorkerModules,
} from "@proto-kit/sequencer";
import { PrivateKey } from "o1js";

import { InMemorySigner } from "../transaction/InMemorySigner";
import { InMemoryTransactionSender } from "../transaction/InMemoryTransactionSender";
import { StateServiceQueryModule } from "../query/StateServiceQueryModule";
import { BlockStorageNetworkStateModule } from "../query/BlockStorageNetworkStateModule";
import { ClientAppChain } from "../client/ClientAppChain";

// ensures we can override vanilla runtime modules type safely
// Partial<VanillaRuntimeModulesRecord> did not work (idk why)
// exporting the same type as below from library also didnt work
// (the type check had no effect)
export type PartialVanillaRuntimeModulesRecord = {
  Balances?: TypedClass<MinimalBalances>;
};

export const randomFeeRecipient = PrivateKey.random().toPublicKey().toBase58();

export class TestingAppChain<
  AppChainModules extends MinimalAppChainDefinition,
> extends ClientAppChain<AppChainModules> {
  public static fromRuntime<
    RuntimeModules extends RuntimeModulesRecord &
      PartialVanillaRuntimeModulesRecord,
  >(runtimeModules: RuntimeModules) {
    const appChain = new TestingAppChain({
      modules: {
        Runtime: Runtime.from({
          modules: VanillaRuntimeModules.with(runtimeModules),
        }),
        Protocol: Protocol.from({
          modules: VanillaProtocolModules.with({}),
        }),
        Sequencer: Sequencer.from({
          modules: InMemorySequencerModules.with({}),
        }),
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
        BatchProducerModule: {},
        LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
        BaseLayer: {},
        BlockProducerModule: {},
        SequencerStartupModule: {},
        TaskQueue: {
          simulatedDuration: 0,
        },
        FeeStrategy: {},
      },
      Signer: {
        signer: PrivateKey.random(),
      },
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

    return await blockTrigger.produceBlock();
  }

  public async produceBlockWithResult() {
    const blockTrigger = this.sequencer.resolveOrFail(
      "BlockTrigger",
      ManualBlockTrigger
    );

    return await blockTrigger.produceBlockWithResult();
  }
}
