import {
  Balance,
  Balances,
  TokenId,
  VanillaProtocolModules
} from "@proto-kit/library";
import { Runtime, runtimeMethod, runtimeModule } from "@proto-kit/module";
import { Protocol } from "@proto-kit/protocol";
import {
  AppChain, AppChainTransaction, BlockStorageNetworkStateModule,
  InMemorySigner,
  InMemoryTransactionSender, StateServiceQueryModule
} from "@proto-kit/sdk";
import {
  BlockProducerModule,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer,
  UnprovenProducerModule,
  VanillaTaskWorkerModules
} from "@proto-kit/sequencer";
import { PrivateKey, PublicKey } from "o1js";
import {
  PrismaDatabaseConfig,
  PrismaRedisDatabase,
  RedisConnectionConfig
} from "../src";

const prismaUrl = process.env["POSTGRES_URL"];
const redisUrl = process.env["REDIS_URL"];
// We don't use the password for CI runs
const redisCI = process.env["REDIS_CI"];

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
  password: redisCI ? undefined : "password",
};

export const IntegrationTestDBConfig = {
  prismaConfig,
  redisConfig
}

export function createPrismaAppchain(prismaConnection: PrismaDatabaseConfig["connection"], redisConnection: RedisConnectionConfig) {
  const appChain = AppChain.from({
    Protocol: Protocol.from({
      modules: VanillaProtocolModules.mandatoryModules({}),
    }),
    Runtime: Runtime.from({
      modules: {
        Balances: MintableBalances,
      },
    }),
    Sequencer: Sequencer.from({
      modules: {
        Database: PrismaRedisDatabase,

        Mempool: PrivateMempool,
        LocalTaskWorkerModule: LocalTaskWorkerModule.from(
          VanillaTaskWorkerModules.withoutSettlement()
        ),
        BaseLayer: NoopBaseLayer,
        BlockProducerModule,
        UnprovenProducerModule,
        BlockTrigger: ManualBlockTrigger,
        TaskQueue: LocalTaskQueue,
      },
    }),
    modules: {
      Signer: InMemorySigner,
      TransactionSender: InMemoryTransactionSender,
      QueryTransportModule: StateServiceQueryModule,
      NetworkStateTransportModule: BlockStorageNetworkStateModule,
    },
  });

  appChain.configurePartial({
    Protocol: {
      AccountState: {},
      BlockProver: {},
      StateTransitionProver: {},
      BlockHeight: {},
      LastStateRoot: {},
    },
    Runtime: {
      Balances: {
      }
    },
    Sequencer: {
      Database: {
        prisma: {
          connection: prismaConnection
        },
        redis: redisConnection
      },
      BlockTrigger: {},
      Mempool: {},
      BlockProducerModule: {},
      LocalTaskWorkerModule: {
        StateTransitionTask: {},
        RuntimeProvingTask: {},
        StateTransitionReductionTask: {},
        BlockReductionTask: {},
        BlockProvingTask: {},
        BlockBuildingTask: {},
      },
      BaseLayer: {},
      UnprovenProducerModule: {},
      TaskQueue: {
        simulatedDuration: 0,
      },
    },
    Signer: {
      signer: PrivateKey.random(),
    },
    TransactionSender: {},
    QueryTransportModule: {},
    NetworkStateTransportModule: {},
  });

  return appChain;
}

@runtimeModule()
export class MintableBalances extends Balances {
  @runtimeMethod()
  public mintDefaultToken(address: PublicKey, amount: Balance){
    this.mint(TokenId.from(0), address, amount)
  }
}

export async function prepareBlock(appChain: ReturnType<typeof createPrismaAppchain>, sender: PublicKey, nonce: number): Promise<AppChainTransaction> {
  const balances = appChain.runtime.resolve("Balances");
  const tx = await appChain.transaction(
    sender,
    () => {
      balances.mintDefaultToken(sender, Balance.from(100));
    },
    { nonce }
  );
  await tx.sign();
  await tx.send();
  return tx;
}