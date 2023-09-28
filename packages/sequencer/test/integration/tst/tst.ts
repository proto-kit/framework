import { runtimeMethod, RuntimeModule, state } from "@proto-kit/module";
import { StateMap } from "@proto-kit/protocol";
import assert from "assert";
import { Bool, Field, PublicKey, Struct, UInt32 } from "snarkyjs";

export class NFTKey extends Struct({
  collection: PublicKey,
  id: UInt32,
}) {
  public static from(collection: PublicKey, id: UInt32) {
    return new NFTKey({ collection, id });
  }
}

export class NFTEntity extends Struct({
  owner: PublicKey,
  metadata: Field, // ipfs hash
  locked: Bool,
}) {}

export class tst extends RuntimeModule<{}> {
  @state() public records = StateMap.from<NFTKey, NFTEntity>(NFTKey, NFTEntity);
  @state() public nonces = StateMap.from<PublicKey, UInt32>(PublicKey, UInt32);

  @runtimeMethod()
  public mint(to: PublicKey, metadata: Field) {
    const minter = this.transaction.sender;
    const minterNonce = this.nonces.get(minter).value;
    const key = NFTKey.from(minter, minterNonce);
    this.records.set(
      key,
      new NFTEntity({ owner: to, metadata, locked: Bool(false) })
    );
    this.nonces.set(minter, minterNonce.add(1));
  }

  /** WORKS */
  //   @runtimeMethod()
  //   public transfer(to: PublicKey, collectionId: PublicKey, id: UInt32) {
  //     const key = NFTKey.from(collectionId, id);
  //     const nft = this.records.get(key).value;
  //     // nft.owner = to;
  //     this.records.set(
  //       key,
  //       new NFTEntity({ owner: to, metadata: nft.metadata, locked: Bool(false) })
  //     );
  //   }

  /** ERRORs */
  @runtimeMethod()
  public transfer(to: PublicKey, collectionId: PublicKey, id: UInt32) {
    const key = NFTKey.from(collectionId, id);
    const nft = this.records.get(key).value;
    nft.owner = to; // this causes the error
    // this.records.set(key, nft);
  }

  /** ERRORs, super weird */
  //   @runtimeMethod()
  //   public transfer(to: PublicKey, collectionId: PublicKey, id: UInt32) {
  //     const key = NFTKey.from(collectionId, id);
  //     const nft = this.records.get(key).value;
  //     nft.owner = to;
  //     this.records.set(
  //       key,
  //       new NFTEntity({ owner: to, metadata: nft.metadata, locked: Bool(false) })
  //     );
  //   }
}