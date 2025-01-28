import { inject } from "tsyringe";
import { log } from "@proto-kit/common";
import { ACTIONS_EMPTY_HASH } from "@proto-kit/protocol";
import {
  MethodIdResolver,
  MethodParameterEncoder,
  Runtime,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import { Provable } from "o1js";

import { Mempool } from "../../../mempool/Mempool";
import {
  sequencerModule,
  SequencerModule,
} from "../../../sequencer/builder/SequencerModule";
import { BlockQueue } from "../../../storage/repositories/BlockStorage";
import { PendingTransaction } from "../../../mempool/PendingTransaction";
import { AsyncMerkleTreeStore } from "../../../state/async/AsyncMerkleTreeStore";
import { AsyncStateService } from "../../../state/async/AsyncStateService";
import {
  Block,
  BlockResult,
  BlockWithResult,
} from "../../../storage/model/Block";
import { CachedStateService } from "../../../state/state/CachedStateService";
import { MessageStorage } from "../../../storage/repositories/MessageStorage";
import { Database } from "../../../storage/Database";

import { TransactionExecutionService } from "./TransactionExecutionService";

export interface BlockConfig {
  allowEmptyBlock?: boolean;
  maximumBlockSize?: number;
}

@sequencerModule()
export class BlockProducerModule extends SequencerModule<BlockConfig> {
  private productionInProgress = false;

  public constructor(
    @inject("Mempool") private readonly mempool: Mempool,
    @inject("MessageStorage") private readonly messageStorage: MessageStorage,
    @inject("UnprovenStateService")
    private readonly unprovenStateService: AsyncStateService,
    @inject("UnprovenMerkleStore")
    private readonly unprovenMerkleStore: AsyncMerkleTreeStore,
    @inject("BlockQueue")
    private readonly blockQueue: BlockQueue,
    @inject("BlockTreeStore")
    private readonly blockTreeStore: AsyncMerkleTreeStore,
    private readonly executionService: TransactionExecutionService,
    @inject("MethodIdResolver")
    private readonly methodIdResolver: MethodIdResolver,
    @inject("Runtime") private readonly runtime: Runtime<RuntimeModulesRecord>,
    @inject("Database") private readonly database: Database
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
        tx.tx.methodId.toBigInt()
      );
      if (!methodName) return;

      const module = this.runtime.resolve(methodName[0]);
      const paramEncoder = MethodParameterEncoder.fromMethod(
        module,
        methodName[1]
      );

      log.info("---------------------------------------");
      log.info(`Transaction #${i}`);
      log.info(
        "Sender:",
        tx.tx.sender.toBase58(),
        "Nonce:",
        tx.tx.nonce.toBigInt()
      );
      log.info(`Method: ${methodName?.join(".")}`);
      log.info();
      if (log.getLevel() <= log.levels.INFO) {
        Provable.log(
          "Arguments:",
          paramEncoder.decode(tx.tx.argsFields, tx.tx.auxiliaryData)
        );
      }
      log.info(
        `Status: ${tx.status.toBoolean()}`,
        tx.statusMessage !== undefined ? `Reason: ${tx.statusMessage}` : ""
      );
    });
    if (block.transactions.length > 0) {
      log.info("---------------------------------------");
    }
  }

  public async generateMetadata(block: Block): Promise<BlockResult> {
    const { result, blockHashTreeStore, treeStore } =
      await this.executionService.generateMetadataForNextBlock(
        block,
        this.unprovenMerkleStore,
        this.blockTreeStore
      );

    await this.database.executeInTransaction(async () => {
      await blockHashTreeStore.mergeIntoParent();
      await treeStore.mergeIntoParent();

      await this.blockQueue.pushResult(result);
    });

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
          `Produced block #${block.height.toBigInt()} (${block.transactions.length} txs)`
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

  private async collectProductionData(): Promise<{
    txs: PendingTransaction[];
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
        `Metadata for block at height ${parentBlock.block.height.toString()} not available`
      );
    } else {
      metadata = {
        block: parentBlock.block,
        // By reconstructing this object, typescript correctly infers the result to be defined
        result: parentBlock.result,
      };
    }

    const messages = await this.messageStorage.getMessages(
      parentBlock?.block.toMessagesHash.toString() ??
        ACTIONS_EMPTY_HASH.toString()
    );

    log.debug(
      `Block collected, ${txs.length} txs, ${messages.length} messages`
    );

    return {
      txs: messages.concat(txs),
      metadata,
    };
  }

  private async produceBlock(): Promise<Block | undefined> {
    this.productionInProgress = true;

    const { txs, metadata } = await this.collectProductionData();

    // Skip production if no transactions are available for now
    if (txs.length === 0 && !this.allowEmptyBlock()) {
      return undefined;
    }

    const cachedStateService = new CachedStateService(
      this.unprovenStateService
    );

    const block = await this.executionService.createBlock(
      cachedStateService,
      txs,
      metadata,
      this.allowEmptyBlock()
    );

    if (block !== undefined) {
      await this.database.executeInTransaction(async () => {
        await cachedStateService.mergeIntoParent();
        await this.blockQueue.pushBlock(block);
      });
    }

    this.productionInProgress = false;

    return block;
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
