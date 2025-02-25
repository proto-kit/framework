import {
  AsyncStateService,
  CachedMerkleTreeStore,
  QueryTransportModule,
  Sequencer,
  SequencerModulesRecord,
  AsyncMerkleTreeStore,
  BlockStorage,
  TreeStoreCreator,
  StateServiceCreator,
  MaskName,
} from "@proto-kit/sequencer";
import { Field } from "o1js";
import { inject, injectable } from "tsyringe";
import { RollupMerkleTree, RollupMerkleTreeWitness } from "@proto-kit/common";

import { AppChainModule } from "../appChain/AppChainModule";

@injectable()
export class StateServiceQueryModule
  extends AppChainModule
  implements QueryTransportModule
{
  public constructor(
    @inject("Sequencer") public sequencer: Sequencer<SequencerModulesRecord>
  ) {
    super();
  }

  private async getCurrentTreeMask() {
    const block = await this.blockStorage().getLatestBlock();
    if (block !== undefined) {
      return MaskName.block(block.block.height);
    }
    return MaskName.base();
  }

  public blockStorage() {
    return this.sequencer.dependencyContainer.resolve<BlockStorage>(
      "BlockStorage"
    );
  }

  public async asyncStateService(): Promise<AsyncStateService> {
    const stateServiceCreator =
      this.sequencer.dependencyContainer.resolve<StateServiceCreator>(
        "StateServiceCreator"
      );
    return stateServiceCreator.getMask(MaskName.base());
  }

  public async treeStore(): Promise<AsyncMerkleTreeStore> {
    const treeStoreCreator =
      this.sequencer.dependencyContainer.resolve<TreeStoreCreator>(
        "TreeStoreCreator"
      );
    return treeStoreCreator.getMask(await this.getCurrentTreeMask());
  }

  public async get(key: Field) {
    const stateService = await this.asyncStateService();
    return await stateService.get(key);
  }

  public async merkleWitness(
    path: Field
  ): Promise<RollupMerkleTreeWitness | undefined> {
    const treeStore = await this.treeStore();
    const syncStore = new CachedMerkleTreeStore(treeStore);
    await syncStore.preloadKey(path.toBigInt());

    const tree = new RollupMerkleTree(syncStore);

    return tree.getWitness(path.toBigInt());
  }
}
