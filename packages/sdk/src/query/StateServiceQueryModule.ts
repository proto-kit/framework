import {
  AsyncStateService,
  CachedMerkleTreeStore,
  QueryTransportModule,
  Sequencer,
  SequencerModulesRecord,
  AsyncMerkleTreeStore,
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

  public get asyncStateService(): AsyncStateService {
    return this.sequencer.dependencyContainer.resolve<AsyncStateService>(
      "UnprovenStateService"
    );
  }

  public get treeStore(): AsyncMerkleTreeStore {
    return this.sequencer.dependencyContainer.resolve("AsyncMerkleStore");
  }

  public get(key: Field) {
    return this.asyncStateService.get(key);
  }

  public async merkleWitness(
    path: Field
  ): Promise<RollupMerkleTreeWitness | undefined> {
    const syncStore = new CachedMerkleTreeStore(this.treeStore);
    await syncStore.preloadKey(path.toBigInt());

    const tree = new RollupMerkleTree(syncStore);

    return tree.getWitness(path.toBigInt());
  }
}
