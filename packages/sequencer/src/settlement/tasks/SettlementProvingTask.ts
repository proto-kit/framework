import {
  filterNonUndefined,
  MOCK_PROOF,
  AreProofsEnabled,
  log,
} from "@proto-kit/common";
import {
  ContractModule,
  MandatoryProtocolModulesRecord,
  MandatorySettlementModulesRecord,
  Protocol,
  ReturnType,
  SettlementContractModule,
  Subclass,
} from "@proto-kit/protocol";
import {
  addCachedAccount,
  Field,
  Mina,
  Types,
  Proof,
  DynamicProof,
  Transaction,
  Void,
  SmartContract,
} from "o1js";
import { inject, injectable, Lifecycle, scoped } from "tsyringe";

import {
  ProofTaskSerializer,
  DynamicProofTaskSerializer,
} from "../../helpers/utils";
import { CompileRegistry } from "../../protocol/production/helpers/CompileRegistry";
import { Task, TaskSerializer } from "../../worker/flow/Task";
import { TaskWorkerModule } from "../../worker/worker/TaskWorkerModule";

import { ContractRegistry } from "./ContractRegistry";

type Account = ReturnType<typeof Mina.getAccount>;

export type ChainStateTaskArgs = {
  accounts: Account[];
  graphql: string | undefined;
};

export type TransactionTaskArgs = {
  transaction: Transaction<false, true>;
  chainState: ChainStateTaskArgs;
};

export type TransactionTaskResult = {
  transaction: Mina.Transaction<true, true>;
};

export class SomeProofSubclass extends Proof<Field, Void> {
  public static publicInputType = Field;

  public static publicOutputType = Void;
}

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

  public settlementContractModule:
    | SettlementContractModule<MandatorySettlementModulesRecord>
    | undefined = undefined;

  private contractRegistry?: ContractRegistry;

  public constructor(
    @inject("Protocol")
    private readonly protocol: Protocol<MandatoryProtocolModulesRecord>,
    private readonly compileRegistry: CompileRegistry,
    @inject("AreProofsEnabled")
    private readonly areProofsEnabled: AreProofsEnabled
  ) {
    super();
    if (
      this.protocol.dependencyContainer.isRegistered("SettlementContractModule")
    ) {
      this.settlementContractModule = this.protocol.dependencyContainer.resolve<
        SettlementContractModule<MandatorySettlementModulesRecord>
      >("SettlementContractModule");
    }
  }

  private async withCustomInstance<T>(
    state: ChainStateTaskArgs,
    f: () => Promise<T>
  ): Promise<T> {
    const { graphql, accounts } = state;

    // For this, we assume that remote networks will only be used with separate
    // worker instances, since they only work with proofs enabled. For
    // LocalBlockchain, caching is not used, as ledger is used directly and all
    // txs are executed sequentially.
    // Therefore, we only need to manually add the accounts for remote networks

    if (graphql !== undefined) {
      const newInstance = Mina.Network(graphql);
      newInstance.proofsEnabled = this.areProofsEnabled.areProofsEnabled;
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
    if (this.settlementContractModule === undefined) {
      throw new Error(
        "Settlement hasn't been configure in the protocol, but settlement task has been dispatched"
      );
    }

    const { transaction, chainState } = input;

    const provenTx = await this.withCustomInstance(chainState, async () => {
      log.info(`Proving tx "${transaction.transaction.memo}"`);
      const proven = await transaction.prove();
      log.info("Proven!");
      return proven;
    });

    return { transaction: provenTx };
  }

  // Subclass<typeof ProofBase> is not exported
  private getProofSerializer(proofType: Subclass<any>) {
    return proofType.prototype instanceof Proof
      ? new ProofTaskSerializer(
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          proofType as Subclass<typeof Proof<any, any>>
        )
      : new DynamicProofTaskSerializer(
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          proofType as Subclass<typeof DynamicProof<any, any>>
        );
  }

  public inputSerializer(): TaskSerializer<TransactionTaskArgs> {
    type AccountJson = ReturnType<typeof Types.Account.toJSON>;
    type LazyProofJson = {
      methodName: string;
      args: ({ fields: string[]; aux: string[] } | string)[];
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
      fromJSON: async (json: string): Promise<TransactionTaskArgs> => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const jsonObject: JsonInputObject = JSON.parse(json);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const commandJson: Types.Json.ZkappCommand = JSON.parse(
          jsonObject.transaction
        );
        const transaction = Mina.Transaction.fromJSON(commandJson);

        for (let index = 0; index < jsonObject.lazyProofs.length; index++) {
          const lazyProof = jsonObject.lazyProofs[index];

          if (lazyProof !== null) {
            // Here, we need to decode the AU's lazyproof into the format
            // that o1js needs to actually create those proofs
            // For that we need to retrieve a few things. Most prominently,
            // we need to get the contract class corresponding to that proof

            const SmartContractClass =
              this.contractRegistry!.getContractClassByName(
                lazyProof.zkappClassName
              );

            if (SmartContractClass === undefined) {
              throw new Error(
                `SmartContract class with name ${lazyProof.zkappClassName} not found in ContractRegistry`
              );
            }

            // eslint-disable-next-line no-underscore-dangle
            const method = SmartContractClass._methods?.find(
              (methodInterface) =>
                methodInterface.methodName === lazyProof.methodName
            );
            if (method === undefined) {
              throw new Error("Method interface not found");
            }

            const allArgs = method.allArgs.slice(2);
            const witnessArgTypes = method.witnessArgs.slice(2);
            const proofTypes = method.proofArgs;
            let proofsDecoded = 0;

            const args = lazyProof.args.map((encodedArg, argsIndex) => {
              if (allArgs[argsIndex].type === "witness") {
                // encodedArg is this type
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                const arg = encodedArg as { fields: string[]; aux: string[] };

                return witnessArgTypes[argsIndex - proofsDecoded].fromFields(
                  arg.fields.map((field) => Field(field)),
                  arg.aux.map((auxI) => JSON.parse(auxI))
                );
              }
              // fields is JsonProof
              const serializer = this.getProofSerializer(
                proofTypes[proofsDecoded]
              );

              proofsDecoded += 1;
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              return serializer.fromJSON(encodedArg as string);
            });

            // eslint-disable-next-line no-await-in-loop
            const previousProofs = await Promise.all(
              lazyProof.previousProofs.map(async (proofString) => {
                if (proofString === MOCK_PROOF) {
                  return MOCK_PROOF;
                }

                const p = await SomeProofSubclass.fromJSON({
                  maxProofsVerified: 0,
                  publicInput: ["0"],
                  publicOutput: [],
                  proof: proofString,
                });
                return p.proof;
              })
            );

            transaction.transaction.accountUpdates[index].lazyAuthorization = {
              methodName: lazyProof.methodName,
              ZkappClass: SmartContractClass,
              args,
              previousProofs: previousProofs,
              blindingValue: Field(lazyProof.blindingValue),
              memoized: [],
              kind: "lazy-proof",
            };
          }
        }

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

      toJSON: (input: TransactionTaskArgs): string => {
        const transaction = input.transaction.toJSON();

        const lazyProofs =
          input.transaction.transaction.accountUpdates.map<LazyProofJson | null>(
            (au) => {
              if (au.lazyAuthorization?.kind === "lazy-proof") {
                const lazyProof = au.lazyAuthorization;

                // eslint-disable-next-line no-underscore-dangle
                const method = lazyProof.ZkappClass._methods?.find(
                  (methodInterface) =>
                    methodInterface.methodName === lazyProof.methodName
                );
                if (method === undefined) {
                  throw new Error("Method interface not found");
                }

                const allArgs = method.allArgs.slice(2); // .filter(arg => arg.type === "witness");
                const witnessArgTypes = method.witnessArgs.slice(2);
                const proofTypes = method.proofArgs;
                let proofsEncoded = 0;

                const encodedArgs = lazyProof.args
                  .map((arg, index) => {
                    if (allArgs[index].type === "witness") {
                      const witness = witnessArgTypes[index - proofsEncoded];
                      const fields = witness
                        .toFields(arg)
                        .map((f) => f.toString());
                      const aux = witness
                        .toAuxiliary(arg)
                        .map((x) => JSON.stringify(x));
                      return {
                        fields,
                        aux,
                      };
                    }
                    if (allArgs[index].type === "proof") {
                      const serializer = this.getProofSerializer(
                        proofTypes[proofsEncoded]
                      );
                      proofsEncoded += 1;
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                      return serializer.toJSON(arg);
                    }
                    throw new Error("Generic parameters not supported");
                  })
                  .filter(filterNonUndefined);

                return {
                  methodName: lazyProof.methodName,
                  zkappClassName: lazyProof.ZkappClass.name,
                  args: encodedArgs,

                  blindingValue: lazyProof.blindingValue.toString(),
                  memoized: [],

                  previousProofs: lazyProof.previousProofs.map((proof) => {
                    if (proof === MOCK_PROOF) {
                      return MOCK_PROOF;
                    }
                    const p = new SomeProofSubclass({
                      proof,
                      publicInput: Field(0),
                      publicOutput: undefined,
                      maxProofsVerified: 0,
                    });
                    return p.toJSON().proof;
                  }),
                };
              }
              return null;
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
    // Guard in case the task is configured but settlement is not
    if (this.settlementContractModule === undefined) {
      return;
    }

    const { areProofsEnabled } = this.areProofsEnabled;

    const contractClasses: Record<string, typeof SmartContract> = {};

    for (const key of this.settlementContractModule.moduleNames) {
      const module: ContractModule<unknown, unknown> =
        this.settlementContractModule.resolve(
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          key as keyof MandatorySettlementModulesRecord
        );

      contractClasses[key] = module.contractFactory();

      // eslint-disable-next-line no-await-in-loop
      await this.compileRegistry.compileSmartContract(
        key,
        module,
        areProofsEnabled
      );
    }

    this.contractRegistry = new ContractRegistry(contractClasses);
  }

  public resultSerializer(): TaskSerializer<TransactionTaskResult> {
    return {
      fromJSON: (json: string) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const jsonObject: Types.Json.ZkappCommand = JSON.parse(json);
        // We can typecast here since the generic typing only hides properties on the type level
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const transaction = Transaction.fromJSON(
          jsonObject
        ) as unknown as Transaction<true, true>;

        return {
          transaction,
        };
      },

      toJSON(input: TransactionTaskResult): string {
        return input.transaction.toJSON();
      },
    };
  }
}
