import {
  AsyncStateService,
  QueryTransportModule,
  CachedLinkedLeafStore,
  AsyncLinkedLeafStore,
} from "@proto-kit/sequencer";
import { Field } from "o1js";
import { inject, injectable } from "tsyringe";
import {
  ModuleContainerLike,
  LinkedMerkleTreeReadWitness,
  LinkedMerkleTree,
} from "@proto-kit/common";

import { AppChainModule } from "../appChain/AppChainModule";

@injectable()
export class StateServiceQueryModule
  extends AppChainModule
  implements QueryTransportModule
{
  public constructor(
    @inject("Sequencer") public sequencer: ModuleContainerLike
  ) {
    super();
  }

  public get asyncStateService(): AsyncStateService {
    return this.sequencer.dependencyContainer.resolve<AsyncStateService>(
      "UnprovenStateService"
    );
  }

  public get treeStore(): AsyncLinkedLeafStore {
    return this.sequencer.dependencyContainer.resolve("AsyncLinkedMerkleStore");
  }

  public get(key: Field) {
    return this.asyncStateService.get(key);
  }

  public async merkleWitness(
    path: Field
  ): Promise<LinkedMerkleTreeReadWitness | undefined> {
    const syncStore = await CachedLinkedLeafStore.new(this.treeStore);
    await syncStore.preloadKey(path.toBigInt());

    const tree = new LinkedMerkleTree(syncStore.treeStore, syncStore);

    return tree.getReadWitness(path.toBigInt());
  }
}
