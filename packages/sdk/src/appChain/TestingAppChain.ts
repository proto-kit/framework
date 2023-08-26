import { ModulesConfig } from "@proto-kit/common";
import {
  InMemoryStateService,
  Runtime,
  RuntimeMethodExecutionContext,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import { ProtocolModulesRecord, VanillaProtocol } from "@proto-kit/protocol";
import {
  PrivateMempool,
  Sequencer,
  LocalTaskWorkerModule,
  NoopBaseLayer,
  BlockProducerModule,
  ManualBlockTrigger,
  TaskQueue,
  LocalTaskQueue,
  SequencerModulesRecord,
} from "@proto-kit/sequencer";
import { PrivateKey, PublicKey } from "snarkyjs";
import { container } from "tsyringe";
import { InMemoryQueryTransportModule } from "../query/InMemoryQueryTransportModule";
import { AuroSigner } from "../transaction/AuroSigner";
import { InMemorySigner } from "../transaction/InMemorySigner";
import { InMemoryTransactionSender } from "../transaction/InMemoryTransactionSender";
import { AppChain, AppChainModulesRecord } from "./AppChain";

// eslint-disable-next-line max-len
// eslint-disable-next-line @shopify/no-fully-static-classes, @typescript-eslint/no-extraneous-class
export class TestingAppChain<
  RuntimeModules extends RuntimeModulesRecord
> extends AppChain<
  RuntimeModules,
  ProtocolModulesRecord,
  SequencerModulesRecord,
  AppChainModulesRecord
> {
  public static fromRuntime<
    RuntimeModules extends RuntimeModulesRecord
  >(definition: {
    modules: RuntimeModules;
    config: ModulesConfig<RuntimeModules>;
  }) {
    const runtime = Runtime.from({
      state: new InMemoryStateService(),

      ...definition,
    });

    const sequencer = Sequencer.from({
      modules: {
        Mempool: PrivateMempool,
        LocalTaskWorkerModule,
        BaseLayer: NoopBaseLayer,
        BlockProducerModule,
        BlockTrigger: ManualBlockTrigger,
      },

      config: {
        BlockTrigger: {},
        Mempool: {},
        BlockProducerModule: {},
        LocalTaskWorkerModule: {},
        BaseLayer: {},
      },
    });

    sequencer.dependencyContainer.register<TaskQueue>("TaskQueue", {
      useValue: new LocalTaskQueue(0),
    });

    return new TestingAppChain({
      runtime,
      sequencer: sequencer as any,
      protocol: VanillaProtocol.create() as any,

      modules: {
        Signer: InMemorySigner,
        TransactionSender: InMemoryTransactionSender,
        QueryTransportModule: InMemoryQueryTransportModule,
      },

      config: {
        Signer: {},
        TransactionSender: {},
        QueryTransportModule: {},
      },
    });
  }

  public setSigner(signer: PrivateKey) {
    this.configure({
      Signer: {
        signer,
      },

      TransactionSender: {},
      QueryTransportModule: {},
    });
  }

  public async produceBlock() {
    const blockTrigger = this.sequencer.resolveOrFail(
      "BlockTrigger",
      ManualBlockTrigger
    );

    return await blockTrigger.produceBlock();
  }
}
