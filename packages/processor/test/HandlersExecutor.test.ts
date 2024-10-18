import "reflect-metadata";
import {
  PrismaClient,
  Balance as PrismaBalance,
} from "@prisma/client-processor";
import { TestingAppChain } from "@proto-kit/sdk";
import { Balance, Balances, TokenId } from "@proto-kit/library";
import { MethodParameterEncoder } from "@proto-kit/module";
import { PrivateKey, PublicKey } from "o1js";
import { mockDeep } from "jest-mock-extended";
import { container } from "tsyringe";

import {
  BlockHandler,
  HandlersExecutor,
  HandlersRecord,
} from "../src/handlers/HandlersExecutor";

const alicePrivateKey = PrivateKey.random();
const alice = alicePrivateKey.toPublicKey();

const bobPrivateKey = PrivateKey.random();
const bob = bobPrivateKey.toPublicKey();

describe("HandlersModule", () => {
  it("should handle blocks", async () => {
    const appChain = TestingAppChain.fromRuntime({
      Balances: Balances,
    });

    appChain.configurePartial({
      Runtime: {
        Balances: {},
      },
    });

    await appChain.start();

    const trackBalanceOnBlockHandler: BlockHandler<PrismaClient> = async (
      client,
      { block, result: blockResult }
    ) => {
      // iterate over all transactions
      for (const tx of block.transactions) {
        const methodId = tx.tx.methodId.toBigInt();

        const methodDescriptor =
          appChain.runtime.methodIdResolver.getMethodNameFromId(methodId);

        if (methodDescriptor === undefined) {
          throw new Error("Unable to retrieve the method descriptor");
        }

        const moduleName = methodDescriptor[0];
        const methodName = methodDescriptor[1];

        const handleBalancesTransferSigned = async () => {
          console.log("handleBalancesTransferSigned");
          const module = appChain.runtime.resolve("Balances");

          const parameterDecoder = MethodParameterEncoder.fromMethod(
            module,
            "transferSigned"
          );

          // @ts-expect-error
          const [, from, to, amount]: [TokenId, PublicKey, PublicKey, Balance] =
            await parameterDecoder.decode(
              tx.tx.argsFields,
              tx.tx.auxiliaryData
            );

          const currentFromBalance = await client.balance.findFirst({
            orderBy: {
              height: "desc",
            },
            where: {
              address: from.toBase58(),
            },
          });

          const newFromBalance =
            (currentFromBalance?.amount != null
              ? BigInt(currentFromBalance.amount)
              : BigInt(0)) - amount.toBigInt();

          await client.balance.create({
            data: {
              address: from.toBase58(),
              height: Number(block.height.toString()),
              amount: newFromBalance > 0n ? newFromBalance.toString() : "0",
            },
          });

          const currentToBalance = await client.balance.findFirst({
            orderBy: {
              height: "desc",
            },
            where: {
              address: to.toBase58(),
            },
          });

          const newToBalance =
            (currentToBalance?.amount != null
              ? BigInt(currentToBalance.amount)
              : BigInt(0)) + amount.toBigInt();

          await client.balance.create({
            data: {
              address: to.toBase58(),
              height: Number(block.height.toString()),
              amount: newToBalance > 0n ? newToBalance.toString() : "0",
            },
          });
        };

        console.log("names", moduleName, methodName);

        // eslint-disable-next-line sonarjs/no-small-switch, default-case
        switch (moduleName) {
          case "Balances":
            // eslint-disable-next-line max-len
            // eslint-disable-next-line sonarjs/no-small-switch, default-case, sonarjs/no-nested-switch
            switch (methodName) {
              case "transferSigned":
                await handleBalancesTransferSigned();
                break;
            }
            break;
        }
      }
    };

    const handlers: HandlersRecord<PrismaClient> = {
      onBlock: [trackBalanceOnBlockHandler],
    };

    // const client = createPrismaMock<PrismaClient>();
    const client = mockDeep<PrismaClient>();
    // @ts-expect-error
    client.$transaction.mockImplementation((transaction) => {
      return transaction(client);
    });

    container.register("Database", {
      useValue: {
        prismaClient: client,
      },
    });

    const handlersExecutor = new (HandlersExecutor.from(handlers))();
    handlersExecutor.create(() => container);
    handlersExecutor.config = {};

    appChain.setSigner(alicePrivateKey);

    const balances = appChain.runtime.resolve("Balances");
    const tx = await appChain.transaction(alice, async () => {
      await balances.transferSigned(
        TokenId.from(0),
        alice,
        bob,
        Balance.from(1000)
      );
    });
    await tx.sign();
    await tx.send();

    const blockWithResult = await appChain.produceBlockWithResult();

    await handlersExecutor.execute(blockWithResult!);

    // inspect calls to the prisma client done in a processor onBlock handler
    const balance: PrismaBalance = client.balance.create.mock.calls[0][0].data;
    expect(balance.address).toBe(alice.toBase58());
    expect(balance.amount).toBe("0");
  });
});
