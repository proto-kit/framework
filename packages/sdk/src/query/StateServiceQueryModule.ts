import {
  AsyncStateService,
  CachedMerkleTreeStore,
  QueryTransportModule,
  Sequencer,
  SequencerModulesRecord,
} from "@proto-kit/sequencer";
import { Field } from "o1js";
import { inject, injectable } from "tsyringe";
import {
  AsyncMerkleTreeStore,
  RollupMerkleTree,
  RollupMerkleWitness,
} from "@proto-kit/protocol";

import { AppChainModule } from "../appChain/AppChainModule";

@injectable()
export class StateServiceQueryModule
  extends AppChainModule<unknown>
  implements QueryTransportModule
{
  public constructor(
    @inject("Sequencer") public sequencer: Sequencer<SequencerModulesRecord>
  ) {
    super();
  }

  public get asyncStateService(): AsyncStateService {
    return this.sequencer.dependencyContainer.resolve("AsyncStateService");
  }

  public get treeStore(): AsyncMerkleTreeStore {
    return this.sequencer.dependencyContainer.resolve("AsyncMerkleStore");
  }

  public async get(key: Field) {
    return await this.asyncStateService.getAsync(key);
  }

  public async merkleWitness(
    path: Field
  ): Promise<RollupMerkleWitness | undefined> {
    const syncStore = new CachedMerkleTreeStore(this.treeStore);
    await syncStore.preloadKey(path.toBigInt());

    const tree = new RollupMerkleTree(syncStore);

    return tree.getWitness(path.toBigInt());
  }
}
