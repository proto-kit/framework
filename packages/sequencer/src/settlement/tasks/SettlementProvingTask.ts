import {
  filterNonUndefined,
  AreProofsEnabled,
  log,
  CompileRegistry,
  mapSequential,
  safeParseJson,
} from "@proto-kit/common";
import {
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
  ProofBase,
  AccountUpdateForest,
  AccountUpdate,
  ProvableType,
  Bool,
  Unconstrained,
  fetchLastBlock,
} from "o1js";
import { inject, injectable, Lifecycle, scoped } from "tsyringe";

import {
  ProofTaskSerializer,
  DynamicProofTaskSerializer,
} from "../../helpers/utils";
import { Task, TaskSerializer } from "../../worker/flow/Task";
import { TaskWorkerModule } from "../../worker/worker/TaskWorkerModule";

import { ContractRegistry } from "./ContractRegistry";

type Account = ReturnType<typeof Mina.getAccount>;

export type ChainStateTaskArgs = {
  accounts: Account[];
  graphql: string | undefined;
  archive: string | undefined;
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
    transaction: Transaction<false, true>,
    state: ChainStateTaskArgs,
    f: () => Promise<T>
  ): Promise<T> {
    const { accounts, graphql, archive } = state;

    // For this, we assume that remote networks will only be used with separate
    // worker instances, since they only work with proofs enabled. For
    // LocalBlockchain, caching is not used, as ledger is used directly and all
    // txs are executed sequentially.
    // Therefore, we only need to manually add the accounts for remote networks

    if (graphql !== undefined) {
      const oldInstance = Mina.activeInstance;
      const newInstance = Mina.Network({
        mina: graphql,
        archive,
      });
      newInstance.proofsEnabled = this.areProofsEnabled.areProofsEnabled;
      Mina.setActiveInstance(newInstance);

      for (const account of accounts) {
        addCachedAccount(account);
      }

      // This fetches the network state
      await fetchLastBlock(graphql);

      const result = await f();

      Mina.setActiveInstance(oldInstance);

      return result;
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

    const provenTx = await this.withCustomInstance(
      transaction,
      chainState,
      async () => {
        log.info(`Proving tx "${transaction.transaction.memo}"`);
        const proven = await transaction.prove();
        log.info("Proven!");
        return proven;
      }
    );

    return { transaction: provenTx };
  }

  private getProofSerializer(proofType: Subclass<typeof ProofBase>) {
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

  private extractProofs(value: unknown): ProofBase[] {
    if (value instanceof Proof || value instanceof DynamicProof) {
      return [value];
    }
    if (value instanceof Unconstrained) return [];
    if (value instanceof Field) return [];
    if (value instanceof Bool) return [];

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.extractProofs(item));
    }

    if (value === null) return [];
    if (typeof value === "object") {
      return this.extractProofs(Object.values(value));
    }

    return [];
  }

  extractProofTypes(type: ProvableType) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const value = ProvableType.synthesize(type);
    const proofValues = this.extractProofs(value);
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return proofValues.map((proof) => proof.constructor as typeof ProofBase);
  }

  public inputSerializer(): TaskSerializer<TransactionTaskArgs> {
    type AccountJson = ReturnType<typeof Types.Account.toJSON>;
    type LazyProofJson = {
      methodName: string;
      args: ({ fields: string[]; aux: string[] } | string)[];
      zkappClassName: string;
      memoized: { fields: string[]; aux: any[] }[];
      blindingValue: string;
    };
    type JsonInputObject = {
      transaction: string;
      lazyProofs: (LazyProofJson | null)[];
      chainState: {
        graphql: string | undefined | null;
        archive: string | undefined | null;
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

            const args = method.args.slice(2);

            // eslint-disable-next-line no-await-in-loop
            const decodedArgs = await mapSequential(
              lazyProof.args,
              async (encodedArg, argsIndex) => {
                const argType = args[argsIndex];
                const argTypeProvable = ProvableType.get(argType);
                const argProofs = this.extractProofTypes(argType);

                if (argProofs.length === 0) {
                  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                  const arg = encodedArg as { fields: string[]; aux: string[] };

                  // Special case for AccountUpdateForest
                  if (
                    arg.aux.length > 0 &&
                    JSON.parse(arg.aux[0]).typeName === "AccountUpdateForest"
                  ) {
                    const [accountUpdatesJSON] = arg.aux.map((aux) =>
                      safeParseJson<{
                        accountUpdates: Types.Json.AccountUpdate[];
                        typeName: "AccountUpdateForest";
                      }>(aux)
                    );
                    const accountUpdates =
                      accountUpdatesJSON.accountUpdates.map((auJSON) =>
                        AccountUpdate.fromJSON(auJSON)
                      );
                    return AccountUpdateForest.fromFlatArray(accountUpdates);
                  }

                  return argTypeProvable.fromFields(
                    arg.fields.map((field) => Field(field)),
                    arg.aux.map((auxI) => JSON.parse(auxI))
                  );
                } else {
                  const serializer = this.getProofSerializer(argProofs[0]);

                  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                  return await serializer.fromJSON(encodedArg as string);
                }
              }
            );

            transaction.transaction.accountUpdates[index].lazyAuthorization = {
              methodName: lazyProof.methodName,
              ZkappClass: SmartContractClass,
              args: decodedArgs,
              blindingValue: Field(lazyProof.blindingValue),
              memoized: lazyProof.memoized.map(({ fields, aux }) => ({
                fields: fields.map((f) => Field(f)),
                aux,
              })),
              kind: "lazy-proof",
            };
          }
        }

        return {
          transaction,
          chainState: {
            graphql: jsonObject.chainState.graphql ?? undefined,
            archive: jsonObject.chainState.archive ?? undefined,
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

                const args = method.args.slice(2);

                const encodedArgs = lazyProof.args
                  .map((arg, index) => {
                    const argType = args[index];
                    const argTypeProvable = ProvableType.get(argType);
                    const argProofs = this.extractProofTypes(argType);

                    if (argProofs.length === 0) {
                      // Special case for AUForest
                      if (arg instanceof AccountUpdateForest) {
                        const accountUpdates = AccountUpdateForest.toFlatArray(
                          arg
                        ).map((update) => AccountUpdate.toJSON(update));

                        return {
                          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                          fields: [] as string[],
                          aux: [
                            JSON.stringify({
                              accountUpdates,
                              typeName: "AccountUpdateForest",
                            }),
                          ],
                        };
                      }

                      const fields = argTypeProvable
                        .toFields(arg)
                        .map((f) => f.toString());
                      const aux = argTypeProvable
                        .toAuxiliary(arg)
                        .map((x) => JSON.stringify(x));

                      return {
                        fields,
                        aux,
                      };
                    } else {
                      const serializer = this.getProofSerializer(argProofs[0]);
                      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                      return serializer.toJSON(arg);
                    }
                  })
                  .filter(filterNonUndefined);

                return {
                  methodName: lazyProof.methodName,
                  zkappClassName: lazyProof.ZkappClass.name,
                  args: encodedArgs,
                  blindingValue: lazyProof.blindingValue.toString(),
                  memoized: lazyProof.memoized.map((value) => ({
                    fields: value.fields.map((f) => f.toString()),
                    aux: value.aux,
                  })),
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
            archive: input.chainState.archive,
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
    const { settlementContractModule } = this;
    // Guard in case the task is configured but settlement is not
    if (settlementContractModule === undefined) {
      throw new Error(
        "Settlement task is configured, but Settlement Contracts aren't"
      );
    }

    const contractClasses: Record<string, typeof SmartContract> = {};

    const modules = settlementContractModule.moduleNames.map(
      (key) =>
        [
          key,
          settlementContractModule.resolve(
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            key as keyof MandatorySettlementModulesRecord
          ),
        ] as const
    );

    // First, create all contract classes (with static args), then compile them
    for (const [key, module] of modules) {
      contractClasses[key] = module.contractFactory();
    }

    for (const [key, module] of modules) {
      log.debug(`Compiling Settlement Module ${key}`);

      // eslint-disable-next-line no-await-in-loop
      await module.compile(this.compileRegistry);
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
