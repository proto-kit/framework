import "reflect-metadata";
import {
  BridgeContract,
  BridgeContractArgs,
  BridgingSettlementContractType,
  ContractArgsRegistry,
  createMessageStruct,
  OutgoingMessageArgument,
  OutgoingMessageArgumentBatch,
  OutgoingMessageKey,
  Path,
  PROTOKIT_FIELD_PREFIXES,
} from "@proto-kit/protocol";
import {
  AccountUpdate,
  Mina,
  PrivateKey,
  SmartContract,
  state,
  State,
  Permissions,
  TokenId,
  Field,
  UInt64,
  Poseidon,
  Provable,
  method,
  Unconstrained,
  VerificationKey,
} from "o1js";
import { container } from "tsyringe";
import { Withdrawal, WithdrawalMessageProcessor } from "@proto-kit/library";
import {
  InMemoryLinkedLeafStore,
  InMemoryMerkleTreeStorage,
  LinkedMerkleTree,
  noop,
} from "@proto-kit/common";
import { beforeAll } from "@jest/globals";

class MockSettlementContract
  extends SmartContract
  implements Pick<BridgingSettlementContractType, "assertStateRoot">
{
  @state(Field) root = State<Field>(Field(100));

  public assertStateRoot(root: Field): AccountUpdate {
    return this.self;
  }

  @method
  public async test() {
    noop();
  }
}

const proofsEnabled = false;

const timeout = proofsEnabled ? 180_000 : 150_000;

describe("bridging contract", () => {
  let chain: Mina.LocalBlockchain;

  beforeAll(async () => {
    chain = await Mina.LocalBlockchain({ proofsEnabled });

    Mina.setActiveInstance(chain);

    container
      .resolve(ContractArgsRegistry)
      .addArgs<BridgeContractArgs>("BridgeContract", {
        SettlementContract: MockSettlementContract,
        messageProcessors: [new WithdrawalMessageProcessor() as any],
      });
  });

  const vks: { verificationKey: VerificationKey }[] = [];

  it(
    "compile",
    async () => {
      const vkSettlement = await MockSettlementContract.compile();
      const vk = await BridgeContract.compile();
      vks.push(vkSettlement, vk);
    },
    timeout
  );

  it(
    "should process withdrawal and mint withdrawal tokens",
    async () => {
      const key1 = PrivateKey.random();
      const key2 = PrivateKey.random();
      const [vkSettlement, vkBridge] = vks;

      const settlement = new MockSettlementContract(key1.toPublicKey());
      const contract = new BridgeContract(key2.toPublicKey());

      const tx = await Mina.transaction(chain.testAccounts[0], async () => {
        AccountUpdate.fundNewAccount(chain.testAccounts[0], 2);

        await settlement.deploy(vkSettlement);

        const accountUpdate = await contract.deployProvable(
          vkBridge.verificationKey,
          false,
          Permissions.default(),
          key1.toPublicKey()
        );
        accountUpdate.requireSignature();
        AccountUpdate.attachToTransaction(accountUpdate);

        AccountUpdate.createSigned(chain.testAccounts[0]).send({
          to: key1.toPublicKey(),
          amount: 1e9,
        });
      });

      const proven = await tx
        .sign([chain.testAccounts[0].key, key1, key2])
        .prove();
      const txId = await proven.send();
      await txId.wait();

      const tree = new LinkedMerkleTree(
        new InMemoryMerkleTreeStorage(),
        new InMemoryLinkedLeafStore()
      );
      const path = Path.fromKey(
        PROTOKIT_FIELD_PREFIXES.OUTGOING_MESSAGE_BASE_PATH,
        OutgoingMessageKey,
        {
          index: Field(0),
          tokenId: contract.tokenId,
        }
      );
      const message = new Withdrawal({
        tokenId: TokenId.default,
        amount: UInt64.from(1e8),
        address: chain.testAccounts[1].key.toPublicKey(),
      });
      const MessageType = createMessageStruct(Withdrawal);
      const messageType = new WithdrawalMessageProcessor().getMessageType();

      tree.setLeaf(
        path.toBigInt(),
        Poseidon.hash(
          MessageType.toFields({ messageType, value: message })
        ).toBigInt()
      );

      const tx2 = await Mina.transaction(chain.testAccounts[0], async () => {
        await contract.updateStateRoot(tree.getRoot());
      });
      const proven2 = await tx2
        .sign([chain.testAccounts[0].key, key1, key2])
        .prove();
      const txId2 = await proven2.send();
      await txId2.wait();

      const treeWitness = tree.getReadWitness(path.toBigInt());

      const tx3 = await Mina.transaction(chain.testAccounts[0], async () => {
        const funded = await contract.rollupOutgoingMessages(
          OutgoingMessageArgumentBatch.fromMessages([
            new OutgoingMessageArgument({
              messageType,
              witness: treeWitness,
              data: Unconstrained.from(Withdrawal.toFields(message)),
            }),
          ])
        );

        let numNewAccountsNumber = 0;
        Provable.asProver(() => {
          numNewAccountsNumber = parseInt(funded.toString(), 10);
        });

        // Pay account creation fees for internal token accounts
        AccountUpdate.fundNewAccount(
          chain.testAccounts[0],
          numNewAccountsNumber
        );
      });
      const proven3 = await tx3
        .sign([chain.testAccounts[0].key, key1, key2])
        .prove();
      const txId3 = await proven3.send();
      await txId3.wait();

      const settlementAccount = chain.getAccount(
        chain.testAccounts[1].key.toPublicKey(),
        contract.deriveTokenId()
      );
      expect(settlementAccount.balance.toString()).toBe((1e8).toString());
    },
    timeout * 3
  );
});
