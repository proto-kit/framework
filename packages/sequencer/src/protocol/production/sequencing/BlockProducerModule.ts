import { inject } from "tsyringe";
import { log } from "@proto-kit/common";
import {
  MethodIdResolver,
  MethodParameterEncoder,
  Runtime,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import { Field, Provable } from "o1js";

import { Mempool } from "../../../mempool/Mempool";
import {
  sequencerModule,
  SequencerModule,
} from "../../../sequencer/builder/SequencerModule";
import { BlockQueue } from "../../../storage/repositories/BlockStorage";
import { PendingTransactionJSONType } from "../../../mempool/PendingTransaction";
import { AsyncMerkleTreeStore } from "../../../state/async/AsyncMerkleTreeStore";
import { AsyncStateService } from "../../../state/async/AsyncStateService";
import {
  Block,
  BlockResult,
  BlockWithResult,
} from "../../../storage/model/Block";
import { Database } from "../../../storage/Database";
import { IncomingMessagesService } from "../../../settlement/messages/IncomingMessagesService";
import { Tracer } from "../../../logging/Tracer";
import { trace } from "../../../logging/trace";
import { AsyncLinkedLeafStore } from "../../../state/async/AsyncLinkedLeafStore";

import { BlockProductionService } from "./BlockProductionService";
import { BlockResultService } from "./BlockResultService";

export interface BlockConfig {
  allowEmptyBlock?: boolean;
  maximumBlockSize?: number;
}

@sequencerModule()
export class BlockProducerModule extends SequencerModule<BlockConfig> {
  private productionInProgress = false;

  public constructor(
    @inject("Mempool") private readonly mempool: Mempool,
    @inject("IncomingMessagesService", { isOptional: true })
    private readonly messageService: IncomingMessagesService | undefined,
    @inject("UnprovenStateService")
    private readonly unprovenStateService: AsyncStateService,
    @inject("UnprovenLinkedLeafStore")
    private readonly unprovenLinkedLeafStore: AsyncLinkedLeafStore,
    @inject("BlockQueue")
    private readonly blockQueue: BlockQueue,
    @inject("BlockTreeStore")
    private readonly blockTreeStore: AsyncMerkleTreeStore,
    private readonly productionService: BlockProductionService,
    private readonly resultService: BlockResultService,
    @inject("MethodIdResolver")
    private readonly methodIdResolver: MethodIdResolver,
    @inject("Runtime") private readonly runtime: Runtime<RuntimeModulesRecord>,
    @inject("Database") private readonly database: Database,
    @inject("Tracer") public readonly tracer: Tracer
  ) {
    super();
  }

  private allowEmptyBlock() {
    return this.config.allowEmptyBlock ?? true;
  }

  private maximumBlockSize() {
    return this.config.maximumBlockSize ?? 20;
  }

  private prettyPrintBlockContents(block: Block) {
    block.transactions.forEach((tx, i) => {
      const methodName = this.methodIdResolver.getMethodNameFromId(
        tx.tx.methodId
      );
      if (!methodName) return;

      const module = this.runtime.resolve(methodName[0]);
      const paramEncoder = MethodParameterEncoder.fromMethod(
        module,
        methodName[1]
      );

      log.info("---------------------------------------");
      log.info(`Transaction #${i}`);
      log.info("Sender:", tx.tx.sender, "Nonce:", tx.tx.nonce);
      log.info(`Method: ${methodName?.join(".")}`);
      log.info();
      if (log.getLevel() <= log.levels.INFO) {
        Provable.log(
          "Arguments:",
          paramEncoder.decode(
            tx.tx.argsFields.map((s) => Field(s)),
            tx.tx.auxiliaryData
          )
        );
      }
      log.info(
        `Status: ${tx.status ? "true" : "false"}`,
        tx.statusMessage !== undefined ? `Reason: ${tx.statusMessage}` : ""
      );
    });
    if (block.transactions.length > 0) {
      log.info("---------------------------------------");
    }
  }

  @trace("block.result", ([block]) => ({ height: block.height }))
  public async generateMetadata(block: Block): Promise<BlockResult> {
    const traceMetadata = {
      height: block.height,
    };

    const { result, blockHashTreeStore, treeStore, stateService } =
      await this.resultService.generateMetadataForNextBlock(
        block,
        this.unprovenLinkedLeafStore,
        this.blockTreeStore,
        this.unprovenStateService
      );

    await this.tracer.trace(
      "block.result.commit",
      async () =>
        await this.database.executeInTransaction(async () => {
          await blockHashTreeStore.mergeIntoParent();
          await treeStore.mergeIntoParent();
          await stateService.mergeIntoParent();

          await this.blockQueue.pushResult(result);
        }),
      traceMetadata
    );

    return result;
  }

  public async tryProduceBlock(): Promise<Block | undefined> {
    if (!this.productionInProgress) {
      try {
        const block = await this.produceBlock();

        if (block === undefined) {
          if (!this.allowEmptyBlock()) {
            log.info("No transactions in mempool, skipping production");
          } else {
            log.error("Something wrong happened, skipping block");
          }
          return undefined;
        }

        log.info(
          `Produced block #${block.height} (${block.transactions.length} txs)`
        );
        this.prettyPrintBlockContents(block);

        return block;
      } catch (error: unknown) {
        if (error instanceof Error) {
          throw error;
        } else {
          log.error(error);
        }
      } finally {
        this.productionInProgress = false;
      }
    }
    return undefined;
  }

  // TODO Move to different service, to remove dependency on mempool and messagequeue
  //  Idea: Create a service that aggregates a bunch of different sources
  @trace("block.collect_inputs")
  private async collectProductionData(): Promise<{
    txs: PendingTransactionJSONType[];
    metadata: BlockWithResult;
  }> {
    const txs = await this.mempool.getTxs(this.maximumBlockSize());

    const parentBlock = await this.blockQueue.getLatestBlockAndResult();

    let metadata: BlockWithResult;

    if (parentBlock === undefined) {
      log.debug(
        "No block metadata given, assuming first block, generating genesis metadata"
      );
      metadata = BlockWithResult.createEmpty();
    } else if (parentBlock.result === undefined) {
      throw new Error(
        `Metadata for block at height ${parentBlock.block.height} not available`
      );
    } else {
      metadata = {
        block: parentBlock.block,
        // By reconstructing this object, typescript correctly infers the result to be defined
        result: parentBlock.result,
      };
    }

    let messages: PendingTransactionJSONType[] = [];
    if (this.messageService !== undefined) {
      messages = await this.messageService.getPendingMessages();
    }

    log.debug(
      `Block collected, ${txs.length} txs, ${messages.length} messages`
    );

    return {
      txs: messages.concat(txs),
      metadata,
    };
  }

  @trace("block")
  private async produceBlock(): Promise<Block | undefined> {
    this.productionInProgress = true;

    const { txs, metadata } = await this.collectProductionData();

    // Skip production if no transactions are available for now
    if (txs.length === 0 && !this.allowEmptyBlock()) {
      return undefined;
    }

    const blockResult = await this.productionService.createBlock(
      this.unprovenStateService,
      txs,
      metadata,
      this.allowEmptyBlock()
    );

    if (blockResult !== undefined) {
      const { block, stateChanges } = blockResult;

      await this.tracer.trace(
        "block.commit",
        async () =>
          // Push changes to the database atomically
          await this.database.executeInTransaction(async () => {
            await stateChanges.mergeIntoParent();
            await this.blockQueue.pushBlock(block);
          }),
        {
          height: block.height,
        }
      );

      // Remove included or dropped txs, leave skipped ones alone
      await this.mempool.removeTxs(
        blockResult.includedTxs
          .filter((x) => x.type === "included")
          .map((x) => x.hash),
        blockResult.includedTxs
          .filter((x) => x.type === "shouldRemove")
          .map((x) => x.hash)
      );
    }

    this.productionInProgress = false;

    return blockResult?.block;
  }

  public async blockResultCompleteCheck() {
    // Check if metadata height is behind block production.
    // This can happen when the sequencer crashes after a block has been produced
    // but before the metadata generation has finished
    const latestBlock = await this.blockQueue.getLatestBlockAndResult();
    // eslint-disable-next-line sonarjs/no-collapsible-if
    if (latestBlock !== undefined) {
      if (latestBlock.result === undefined) {
        await this.generateMetadata(latestBlock.block);
      }
      // Here, the metadata has been computed already
    }
    // If we reach here, its a genesis startup, no blocks exist yet
  }

  public async start() {
    await this.blockResultCompleteCheck();
  }
}
