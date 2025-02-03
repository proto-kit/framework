import {
  createMerkleTree,
  InMemoryMerkleTreeStorage,
  log,
} from "@proto-kit/common";
import { Field, Poseidon, PublicKey, SmartContract, Struct } from "o1js";

/**
 * Merkle tree that contains all the deployed token bridges as a mapping of
 * tokenId => PublicKey
 *
 * It should be used as an append-only tree with incremental indizes - this allows
 * us to reduce the height of it
 */
export class TokenBridgeTree extends createMerkleTree(256) {
  public indizes: Record<string, bigint> = {};

  /**
   * Initializes and fills the tree based on all on-chain events that have been
   * emitted by every emit
   */
  public static async buildTreeFromEvents(
    contract: SmartContract & {
      events: { "token-bridge-added": typeof TokenBridgeTreeAddition };
    }
  ) {
    const events = await contract.fetchEvents();

    log.debug(`Found ${events.length} token bridge add events`);

    const tree = new TokenBridgeTree(new InMemoryMerkleTreeStorage());
    const indizes: Record<string, bigint> = {};

    events.forEach(({ type, event }) => {
      if (type === "token-bridge-added") {
        const addition =
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          event.data as unknown as TokenBridgeTreeAddition;

        tree.setLeaf(addition.index.toBigInt(), addition.value.hash());

        indizes[addition.value.tokenId.toString()] = addition.index.toBigInt();
      }
    });
    tree.indizes = indizes;
    return tree;
  }

  public getIndex(tokenId: Field): bigint {
    return this.indizes[tokenId.toString()];
  }
}

export class TokenBridgeTreeWitness extends TokenBridgeTree.WITNESS {}

export class TokenBridgeEntry extends Struct({
  address: PublicKey,
  tokenId: Field,
}) {
  public hash() {
    return Poseidon.hash(TokenBridgeEntry.toFields(this));
  }
}

export class TokenBridgeAttestation extends Struct({
  witness: TokenBridgeTreeWitness,
  index: Field,
}) {}

export class TokenBridgeTreeAddition extends Struct({
  index: Field,
  value: TokenBridgeEntry,
}) {}
