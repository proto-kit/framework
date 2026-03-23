// eslint-disable-next-line import/no-extraneous-dependencies
import {
  Balance,
  Balances,
  TokenId,
  VanillaProtocolModules,
} from "@proto-kit/library";
import {
  Runtime,
  RuntimeEvents,
  runtimeMethod,
  runtimeModule,
} from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  AppChainTransaction,
  BlockStorageNetworkStateModule,
  ClientAppChain,
  InMemoryBlockExplorer,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "@proto-kit/sdk";
import {
  BatchProducerModule,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer,
  BlockProducerModule,
  VanillaTaskWorkerModules,
  SequencerStartupModule,
} from "@proto-kit/sequencer";
import { Bool, PrivateKey, PublicKey, Struct } from "o1js";

import {
  PrismaDatabaseConfig,
  PrismaRedisDatabase,
  RedisConnectionConfig,
} from "../src";

/* eslint-disable @typescript-eslint/dot-notation */

const prismaUrl = process.env["POSTGRES_URL"];
const redisUrl = process.env["REDIS_URL"];
// We don't use the password for CI runs
const redisCI = process.env["REDIS_CI"];

/* eslint-enable @typescript-eslint/dot-notation */

const prismaConfig = {
  host: prismaUrl ?? "localhost",
  password: "password",
  username: "admin",
  port: 5432,
  db: {
    name: "protokit",
  },
};

const redisConfig = {
  host: redisUrl ?? "localhost",
  port: 6379,
  password: redisCI !== undefined ? undefined : "password",
};

export const IntegrationTestDBConfig = {
  prismaConfig,
  redisConfig,
};

export class TestEvent extends Struct({
  message: Bool,
}) {}

@runtimeModule()
export class MintableBalances extends Balances {
  public events = new RuntimeEvents({
    test: TestEvent,
  });

  @runtimeMethod()
  public async mintDefaultToken(address: PublicKey, amount: Balance) {
    await this.mint(TokenId.from(0), address, amount);
    this.events.emit("test", new TestEvent({ message: Bool(false) }));
  }
}

export function createPrismaAppchain(
  prismaConnection: PrismaDatabaseConfig["connection"],
  redisConnection: RedisConnectionConfig,
  pruneOnStartup = false
) {
  const appChain = ClientAppChain.from({
    Protocol: Protocol.from(VanillaProtocolModules.mandatoryModules({})),
    Runtime: Runtime.from({
      Balances: MintableBalances,
    }),
    Sequencer: Sequencer.from({
      Database: PrismaRedisDatabase,

      Mempool: PrivateMempool,
      LocalTaskWorkerModule: LocalTaskWorkerModule.from(
        VanillaTaskWorkerModules.withoutSettlement()
      ),
      BaseLayer: NoopBaseLayer,
      BatchProducerModule,
      BlockProducerModule,
      BlockTrigger: ManualBlockTrigger,
      TaskQueue: LocalTaskQueue,
      SequencerStartupModule,
    }),
    Signer: InMemorySigner,
    TransactionSender: InMemoryTransactionSender,
    QueryTransportModule: StateServiceQueryModule,
    NetworkStateTransportModule: BlockStorageNetworkStateModule,
    BlockExplorerTransportModule: InMemoryBlockExplorer,
  });

  appChain.configurePartial({
    Protocol: {
      AccountState: {},
      BlockProver: {},
      StateTransitionProver: {},
      TransactionProver: {},
      BlockHeight: {},
      LastStateRoot: {},
    },
    Runtime: {
      Balances: {},
    },
    Sequencer: {
      Database: {
        prisma: {
          connection: prismaConnection,
        },
        redis: redisConnection,
        databasePruneModule: {
          pruneOnStartup,
        },
      },
      BlockTrigger: {},
      Mempool: {},
      BatchProducerModule: {},
      LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
      BaseLayer: {},
      BlockProducerModule: {},
      TaskQueue: {
        simulatedDuration: 0,
      },
      SequencerStartupModule: {},
    },
    Signer: {
      signer: PrivateKey.random(),
    },
    TransactionSender: {},
    QueryTransportModule: {},
    NetworkStateTransportModule: {},
    BlockExplorerTransportModule: {},
  });

  return appChain;
}

export async function prepareBlock(
  appChain: ReturnType<typeof createPrismaAppchain>,
  sender: PublicKey,
  nonce: number
): Promise<AppChainTransaction> {
  const balances = appChain.runtime.resolve("Balances");
  const tx = await appChain.transaction(
    sender,
    async () => {
      await balances.mintDefaultToken(sender, Balance.from(100));
    },
    { nonce }
  );
  await tx.sign();
  await tx.send();
  return tx;
}
