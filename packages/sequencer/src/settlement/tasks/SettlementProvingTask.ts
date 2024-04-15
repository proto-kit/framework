import { filterNonUndefined, MOCK_PROOF } from "@proto-kit/common";
import {
  MandatoryProtocolModulesRecord,
  MandatorySettlementModulesRecord,
  Protocol,
  ProtocolModulesRecord,
  ReturnType,
  SettlementContractModule,
} from "@proto-kit/protocol";
import { addCachedAccount, Field, Mina, Types } from "o1js";
import { Transaction as MinaTransaction } from "o1js/dist/node/lib/mina/mina";
// TODO Wait for o1js upgrade
import { Pickles } from "o1js/dist/node/snarky";
import { inject, injectable, Lifecycle, scoped } from "tsyringe";

import { ProofTaskSerializer } from "../../helpers/utils";
import { CompileRegistry } from "../../protocol/production/tasks/CompileRegistry";
import { Task } from "../../worker/flow/Task";
import { TaskSerializer } from "../../worker/manager/ReducableTask";
import { TaskWorkerModule } from "../../worker/worker/TaskWorkerModule";

type Account = ReturnType<typeof Mina.getAccount>;

export type ChainStateTaskArgs = {
  accounts: Account[];
  graphql: string | undefined;
};

export type TransactionTaskArgs = {
  transaction: Mina.Transaction;
  chainState: ChainStateTaskArgs;
};

export type TransactionTaskResult = {
  transaction: Mina.Transaction;
};

/**
 * Implementation of a task to prove any Mina transaction.
 * The o1js-internal account state is configurable via the task args.
 * It also dynamically retrieves the proof generation parameters from
 * the provided AccountUpdate
 */
@injectable()
@scoped(Lifecycle.ContainerScoped)
export class SettlementProvingTask
  extends TaskWorkerModule
  implements Task<TransactionTaskArgs, TransactionTaskResult>
{
  public name = "settlementTransactions";

  public settlementContractModule: SettlementContractModule<MandatorySettlementModulesRecord>;

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    private readonly compileRegistry: CompileRegistry
  ) {
    super();
    this.settlementContractModule = this.protocol.dependencyContainer.resolve<
      SettlementContractModule<MandatorySettlementModulesRecord>
    >("SettlementContractModule");
  }

  private async withCustomInstance<T>(
    state: ChainStateTaskArgs,
    f: () => Promise<T>
  ): Promise<T> {
    const { graphql, accounts } = state;

    // For this, we assume that remote networks will only be used with separate
    // worker instances, since they only work with proofs enabled. For
    // LocalBlockchain, caching is not used, as ledger is used directly and all
    // txs are executed seequentially.
    // Therefore, we only need to manually add the accounts for remote networks

    if (graphql !== undefined) {
      const newInstance = Mina.Network(graphql);
      Mina.setActiveInstance(newInstance);

      for (const account of accounts) {
        addCachedAccount(account);
      }
    }
    return await f();
  }

  public async compute(
    input: TransactionTaskArgs
  ): Promise<TransactionTaskResult> {
    const { transaction, chainState } = input;

    const proofs = await this.withCustomInstance(chainState, async () => {
      return await transaction.prove();
    });

    return { transaction };
  }

  public inputSerializer(): TaskSerializer<TransactionTaskArgs> {
    type AccountJson = ReturnType<typeof Types.Account.toJSON>;
    type LazyProofJson = {
      methodName: string;
      args: (string[] | string)[];
      previousProofs: string[];
      zkappClassName: string;
      memoized: { fields: string[]; aux: any[] }[];
      blindingValue: string;
    };
    type JsonInputObject = {
      transaction: string;
      lazyProofs: (LazyProofJson | null)[];
      chainState: {
        graphql: string | undefined | null;
        accounts: AccountJson[];
      };
    };
    return {
      fromJSON: (json: string): TransactionTaskArgs => {
        const jsonObject = JSON.parse(json) as JsonInputObject;
        const commandJson: Types.Json.ZkappCommand = JSON.parse(
          jsonObject.transaction
        );
        const transaction = MinaTransaction.fromJSON(commandJson);

        jsonObject.lazyProofs.forEach((lazyProof, index) => {
          if (lazyProof !== null) {
            // Here, we need to decode the AU's lazyproof into the format
            // that o1js needs to actually create those proofs
            // For that we need to retrieve a few things. Most prominently,
            // we need to get the contract class corresponding to that proof

            const SmartContract = this.compileRegistry.getContractClassByName(
              lazyProof.zkappClassName
            );

            if (SmartContract === undefined) {
              throw new Error(
                `SmartContract class with name ${lazyProof.zkappClassName} not found in CompileRegistry`
              );
            }

            const method = SmartContract._methods?.find(
              (method) => method.methodName === lazyProof.methodName
            );
            if (method === undefined) {
              throw new Error("Method interface not found");
            }

            const allArgs = method.allArgs.slice(2);
            const witnessArgTypes = method.witnessArgs.slice(2);
            const proofTypes = method.proofArgs;
            let proofsDecoded = 0;

            const args = lazyProof.args.map((encodedArg, index) => {
              if (allArgs[index].type === "witness") {
                // encodedArg is string[]
                return witnessArgTypes[index - proofsDecoded].fromFields(
                  (encodedArg as string[]).map((field) => Field(field)),
                  []
                );
              } else {
                // fields is JsonProof
                const serializer = new ProofTaskSerializer(
                  proofTypes[proofsDecoded]
                );
                proofsDecoded++;
                return serializer.fromJSON(encodedArg as string);
              }
            });

            transaction.transaction.accountUpdates[index].lazyAuthorization = {
              methodName: lazyProof.methodName,
              ZkappClass: SmartContract,
              args,
              previousProofs: lazyProof.previousProofs.map((proofString) =>
                proofString === MOCK_PROOF
                  ? MOCK_PROOF
                  : Pickles.proofOfBase64(proofString, 0)
              ),
              blindingValue: Field(lazyProof.blindingValue),
              memoized: [],
              kind: "lazy-proof",
            };
          }
        });

        return {
          transaction,
          chainState: {
            graphql: jsonObject.chainState.graphql ?? undefined,
            accounts: jsonObject.chainState.accounts.map((account) =>
              Types.Account.fromJSON(account)
            ),
          },
        };
      },

      toJSON(input: TransactionTaskArgs): string {
        const transaction = input.transaction.toJSON();

        const lazyProofs =
          input.transaction.transaction.accountUpdates.map<LazyProofJson | null>(
            (au) => {
              if (au.lazyAuthorization?.kind === "lazy-proof") {
                const lazyProof = au.lazyAuthorization;

                const method = lazyProof.ZkappClass._methods?.find(
                  (method) => method.methodName === lazyProof.methodName
                );
                if (method === undefined) {
                  throw new Error("Method interface not found");
                }

                const allArgs = method.allArgs.slice(2); //.filter(arg => arg.type === "witness");
                const witnessArgTypes = method.witnessArgs.slice(2);
                const proofTypes = method.proofArgs;
                let proofsEncoded = 0;

                const encodedArgs = lazyProof.args
                  .map((arg, index) => {
                    if (allArgs[index].type === "witness") {
                      return witnessArgTypes[index - proofsEncoded]
                        .toFields(arg)
                        .map((f) => f.toString());
                    } else if (allArgs[index].type === "proof") {
                      const serializer = new ProofTaskSerializer(
                        proofTypes[proofsEncoded]
                      );
                      proofsEncoded++;
                      return serializer.toJSON(arg);
                    } else {
                      throw new Error("Generic parameters not supported");
                    }
                  })
                  .filter(filterNonUndefined);

                return {
                  methodName: lazyProof.methodName,
                  zkappClassName: lazyProof.ZkappClass.name,
                  args: encodedArgs,

                  blindingValue: lazyProof.blindingValue.toString(),
                  memoized: [],

                  previousProofs: lazyProof.previousProofs.map((proof) =>
                    proof === MOCK_PROOF
                      ? MOCK_PROOF
                      : Pickles.proofToBase64([0, proof])
                  ),
                };
              } else {
                return null;
              }
            }
          );

        const jsonObject: JsonInputObject = {
          transaction,
          lazyProofs,
          chainState: {
            graphql: input.chainState.graphql,
            accounts: input.chainState.accounts.map((account) =>
              Types.Account.toJSON(account)
            ),
          },
        };
        return JSON.stringify(jsonObject);
      },
    };
  }

  public async prepare(): Promise<void> {
    const contract = this.settlementContractModule.getContractClasses();

    const proofsEnabled = Mina.activeInstance.proofsEnabled;

    await this.compileRegistry.compileSmartContract(
      "DispatchContract",
      contract.dispatch,
      proofsEnabled
    );
    await this.compileRegistry.compileSmartContract(
      "SettlementContract",
      contract.settlement,
      proofsEnabled
    );
  }

  public resultSerializer(): TaskSerializer<TransactionTaskResult> {
    return {
      fromJSON: (json: string) => {
        const jsonObject: Types.Json.ZkappCommand = JSON.parse(json);
        return { transaction: MinaTransaction.fromJSON(jsonObject) };
      },

      toJSON(input: TransactionTaskResult): string {
        return input.transaction.toJSON();
      },
    };
  }
}
