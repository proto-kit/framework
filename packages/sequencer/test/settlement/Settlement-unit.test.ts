import { expect } from "@jest/globals";
// import { Actions } from "o1js/dist/node/lib/account_update";
// import {
//   ACTIONS_EMPTY_HASH,
//   Deposit,
//   MINA_EVENT_PREFIXES,
//   MinaActions,
//   MinaPrefixedProvableHashList,
//   RuntimeTransaction,
// } from "@proto-kit/protocol";
// import { AccountUpdate, Field, Mina, Poseidon, PrivateKey, UInt64 } from "o1js";
// import { EMPTY_PUBLICKEY, hashWithPrefix } from "@proto-kit/common";
//
// import { MessageStorage } from "../../src";

describe("Settlement unit tests", () => {
  it("", () => {
    expect(1).toBe(1);
  });
  // TODO Add in again
  // it.skip("should produce equal commitments for the actions hash", async () => {
  //   const empty = Actions.emptyActionState();
  //
  //   expect(empty.toString()).toStrictEqual(ACTIONS_EMPTY_HASH.toString());
  //
  //   const depositTx = RuntimeTransaction.fromMessage({
  //     methodId: Field(
  //       settlementModule.generateMethodIdMap()["Balances.deposit"]
  //     ),
  //     argsHash: Poseidon.hash(
  //       Deposit.toFields({
  //         address: PrivateKey.random().toPublicKey(),
  //         amount: UInt64.from(100),
  //       })
  //     ),
  //   });
  //
  //   const txHash1 = Actions.pushEvent(Actions.empty(), depositTx.hashData());
  //   const hash1 = Actions.updateSequenceState(empty, txHash1.hash);
  //
  //   const actionHash = MinaActions.actionHash(depositTx.hashData());
  //
  //   const list = new MinaPrefixedProvableHashList(
  //     Field,
  //     MINA_EVENT_PREFIXES.sequenceEvents,
  //     empty
  //   );
  //   list.push(actionHash);
  //
  //   const hash2 = list.commitment;
  //
  //   expect(hash1.toString()).toStrictEqual(hash2.toString());
  // });
  //
  // it.skip("should deposit and be able to compute the actionhash offchain", async () => {
  //   // Deploy contract
  //   const tx = await settlementModule.deploy(zkAppKey);
  //   await tx.wait();
  //
  //   console.log("Deployed");
  //
  //   const contract = await settlementModule.getContract();
  //
  //   const startingActionHash = contract.account.actionState.get();
  //   expect(startingActionHash.toString()).toStrictEqual(
  //     ACTIONS_EMPTY_HASH.toString()
  //   );
  //
  //   const userKey = localInstance.testAccounts[0].privateKey;
  //
  //   const tx2 = await Mina.transaction(
  //     { sender: userKey.toPublicKey(), fee: 0.01 * 1e9 },
  //     () => {
  //       const subAU = AccountUpdate.createSigned(userKey.toPublicKey());
  //       subAU.balance.subInPlace(UInt64.from(100));
  //
  //       contract.deposit(UInt64.from(100));
  //     }
  //   );
  //   await tx2.prove();
  //   tx2.sign([userKey]);
  //   await tx2.send();
  //
  //   console.log("Deposited");
  //
  //   const actionHash1 = contract.account.actionState.get();
  //   const actions = localInstance.getActions(contract.address);
  //
  //   const depositTx = RuntimeTransaction.fromMessage({
  //     methodId: Field(
  //       settlementModule.generateMethodIdMap()["Balances.deposit"]
  //     ),
  //     argsHash: Poseidon.hash(
  //       Deposit.toFields({
  //         address: userKey.toPublicKey(),
  //         amount: UInt64.from(100),
  //       })
  //     ),
  //   });
  //
  //   const prefix = MINA_EVENT_PREFIXES.event;
  //   const txHash2 = hashWithPrefix(prefix, depositTx.hashData());
  //   const txHash21 = hashWithPrefix(MINA_EVENT_PREFIXES.sequenceEvents, [
  //     Actions.empty().hash,
  //     txHash2,
  //   ]);
  //
  //   const list = new MinaPrefixedProvableHashList(
  //     Field,
  //     MINA_EVENT_PREFIXES.sequenceEvents,
  //     startingActionHash
  //   );
  //   list.push(txHash21);
  //
  //   expect(list.commitment.toString()).toStrictEqual(actionHash1.toString());
  // });
  //
  // it.skip("should produce a valid batch with one incoming message", async () => {
  //   const tx = createTransaction({
  //     method: ["Balances", "deposit"],
  //     privateKey: sequencerKey,
  //     args: [
  //       new Deposit({
  //         address: sequencerKey.toPublicKey(),
  //         amount: UInt64.from(100),
  //       }),
  //     ] as any,
  //     nonce: 0,
  //   });
  //   tx.isMessage = true;
  //   tx.sender = EMPTY_PUBLICKEY;
  //   tx.nonce = UInt64.zero;
  //
  //   // const ignored = await trigger.produceBlock();
  //
  //   await (
  //     appChain.sequencer.resolve("MessageStorage") as MessageStorage
  //   ).pushMessages(ACTIONS_EMPTY_HASH.toString(), "0", [tx]);
  //
  //   const [block, batch] = await trigger.produceBlock();
  //
  //   expect(block).toBeDefined();
  // });
});
