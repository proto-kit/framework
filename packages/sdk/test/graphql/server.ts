// import "reflect-metadata";
// import { PrivateKey, PublicKey, UInt64 } from "o1js";
// import {
//   Runtime,
//   runtimeMethod,
//   RuntimeModule,
//   runtimeModule,
//   state,
// } from "@proto-kit/module";
// <<<<<<< HEAD
// import { Option, Protocol, State, StateMap } from "@proto-kit/protocol";
// import {
//   Balance,
//   Balances,
//   BalancesKey,
//   TokenId,
//   VanillaProtocolModules,
//   VanillaRuntimeModules,
// } from "@proto-kit/library";
// import { Presets } from "@proto-kit/common";
// import {
// =======
// import { Option, State, StateMap, VanillaProtocol } from "@proto-kit/protocol";
// import { log, Presets } from "@proto-kit/common";
// import {
// >>>>>>> 088672e130d304868c38409d5711d4a365e92625
//   BlockProducerModule,
//   LocalTaskQueue,
//   LocalTaskWorkerModule,
//   ManualBlockTrigger,
//   NoopBaseLayer,
//   PrivateMempool,
//   Sequencer,
// <<<<<<< HEAD
// =======
//   SettlementModule,
//   TimedBlockTrigger,
// >>>>>>> 088672e130d304868c38409d5711d4a365e92625
//   UnprovenProducerModule,
// } from "@proto-kit/sequencer";
// import {
//   BlockStorageResolver,
//   GraphqlSequencerModule,
//   GraphqlServer,
//   MempoolResolver,
//   MerkleWitnessResolver,
//   NodeStatusResolver,
//   QueryGraphqlModule,
//   UnprovenBlockResolver,
// } from "@proto-kit/api";
// import { container } from "tsyringe";
// <<<<<<< HEAD
// import { BlockStorageNetworkStateModule } from "../../src/query/BlockStorageNetworkStateModule";
// import { MessageBoard } from "./Post";
// import { Balances as BaseBalances } from "@proto-kit/library";
// =======
// import { PrismaRedisDatabase } from "@proto-kit/persistance";

// import { AppChain, StateServiceQueryModule, InMemorySigner, InMemoryTransactionSender, BlockStorageNetworkStateModule } from "../../src";

// import { MessageBoard } from "./Post";
// >>>>>>> 088672e130d304868c38409d5711d4a365e92625

// @runtimeModule()
// export class TestBalances extends Balances {
//   /**
//    * We use `satisfies` here in order to be able to access
//    * presets by key in a type safe way.
//    */
//   public static presets = {} satisfies Presets<object>;

//   @state() public totalSupply = State.from<UInt64>(UInt64);

//   @runtimeMethod()
//   public getBalance(tokenId: TokenId, address: PublicKey): Balance {
//     return super.getBalance(tokenId, address);
//   }

//   @runtimeMethod()
//   public addBalance(tokenId: TokenId, address: PublicKey, balance: UInt64) {
//     const totalSupply = this.totalSupply.get();
//     this.totalSupply.set(totalSupply.orElse(UInt64.zero).add(balance));

//     const previous = this.balances.get(new BalancesKey({ tokenId, address }));
//     this.balances.set(
//       new BalancesKey({ tokenId, address }),
//       previous.orElse(UInt64.zero).add(balance)
//     );
//   }
// }

// export async function startServer() {
//   log.setLevel("DEBUG");

//   const appChain = AppChain.from({
//     Runtime: Runtime.from({
//       modules: VanillaRuntimeModules.with({
//         Balances: TestBalances,
//       }),
//     }),

// <<<<<<< HEAD
//     Protocol: Protocol.from({
//       modules: VanillaProtocolModules.with({}),
//     }),
// =======
//     protocol: VanillaProtocol.from({}),
// >>>>>>> 088672e130d304868c38409d5711d4a365e92625

//     Sequencer: Sequencer.from({
//       modules: {
//         // Database: InMemoryDatabase,
//         Database: PrismaRedisDatabase,

//         Mempool: PrivateMempool,
//         GraphqlServer,
//         LocalTaskWorkerModule,
//         BaseLayer: NoopBaseLayer,
//         BlockProducerModule,
//         UnprovenProducerModule,
//         BlockTrigger: ManualBlockTrigger,
//         TaskQueue: LocalTaskQueue,
//         SettlementModule: SettlementModule,

//         Graphql: GraphqlSequencerModule.from({
//           modules: {
//             MempoolResolver,
//             QueryGraphqlModule,
//             BlockStorageResolver,
//             UnprovenBlockResolver,
//             NodeStatusResolver,
//             MerkleWitnessResolver,
//           },

//           config: {
//             MempoolResolver: {},
//             QueryGraphqlModule: {},
//             BlockStorageResolver: {},
//             NodeStatusResolver: {},
//             MerkleWitnessResolver: {},
//             UnprovenBlockResolver: {},
//           },
//         }),
//       },
//     }),

//     modules: {
//       Signer: InMemorySigner,
//       TransactionSender: InMemoryTransactionSender,
//       QueryTransportModule: StateServiceQueryModule,
//       NetworkStateTransportModule: BlockStorageNetworkStateModule,
//     },
//   });

//   appChain.configure({
//     Runtime: {
//       Balances: {},
//     },

//     Protocol: {
//       BlockProver: {},
//       StateTransitionProver: {},
//       AccountState: {},
//       BlockHeight: {},
// <<<<<<< HEAD
//       TransactionFee: {
//         tokenId: 0n,
//         feeRecipient: PrivateKey.random().toPublicKey().toBase58(),
//         baseFee: 0n,
//         methods: {},
//         perWeightUnitFee: 0n,
//       },
// =======
//       LastStateRoot: {},
// >>>>>>> 088672e130d304868c38409d5711d4a365e92625
//     },

//     Sequencer: {
//       GraphqlServer: {
//         port: 8080,
//         host: "0.0.0.0",
//         graphiql: true,
//       },
//       SettlementModule: {
//         address: PrivateKey.random().toPublicKey(),
//         feepayer: PrivateKey.random(),
//       },

//       Graphql: {
//         QueryGraphqlModule: {},
//         MempoolResolver: {},
//         BlockStorageResolver: {},
//         NodeStatusResolver: {},
//         UnprovenBlockResolver: {},
//         MerkleWitnessResolver: {},
//       },

//       Database: {
//         redis: {
//           host: "localhost",
//           port: 6379,
//           password: "password",
//         },
//         prisma: {
//           connection: {
//             host: "localhost",
//             password: "password",
//             username: "user",
//             port: 5432,
//             db: {
//               name: "protokit",
//             }
//           }
//         },
//       },

//       Mempool: {},
//       BlockProducerModule: {},
//       LocalTaskWorkerModule: {},
//       BaseLayer: {},
//       TaskQueue: {},

//       UnprovenProducerModule: {
//         allowEmptyBlock: true,
//       },

//       BlockTrigger: {},
//     },

//     TransactionSender: {},
//     QueryTransportModule: {},
//     NetworkStateTransportModule: {},

//     Signer: {
//       signer: PrivateKey.random(),
//     },
//   });

//   await appChain.start(container.createChildContainer());
//   const pk = PublicKey.fromBase58(
//     "B62qmETai5Y8vvrmWSU8F4NX7pTyPqYLMhc1pgX3wD8dGc2wbCWUcqP"
//   );

//   const balances = appChain.runtime.resolve("Balances");

//   const priv = PrivateKey.fromBase58(
//     "EKFEMDTUV2VJwcGmCwNKde3iE1cbu7MHhzBqTmBtGAd6PdsLTifY"
//   );

// <<<<<<< HEAD
//   const tokenId = TokenId.from(0);

//   const tx = await appChain.transaction(priv.toPublicKey(), () => {
//     balances.addBalance(tokenId, priv.toPublicKey(), UInt64.from(1000));
//   });
// =======
//   const as = await appChain.query.protocol.AccountState.accountState.get(
//     priv.toPublicKey()
//   );
//   const nonce = Number(as?.nonce.toString() ?? "0");

//   const tx = await appChain.transaction(
//     priv.toPublicKey(),
//     () => {
//       balances.addBalance(priv.toPublicKey(), UInt64.from(1000));
//     },
//     {
//       nonce,
//     }
//   );
// >>>>>>> 088672e130d304868c38409d5711d4a365e92625
//   appChain.resolve("Signer").config.signer = priv;
//   await tx.sign();
//   await tx.send();

//   const tx2 = await appChain.transaction(
//     priv.toPublicKey(),
//     () => {
//       balances.addBalance(tokenId, priv.toPublicKey(), UInt64.from(1000));
//     },
//     { nonce: nonce + 1 }
//   );
//   await tx2.sign();
//   await tx2.send();

//   return appChain;
// }
