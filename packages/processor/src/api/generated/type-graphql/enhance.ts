import { ClassType } from "type-graphql";
import * as tslib from "tslib";
import * as crudResolvers from "./resolvers/crud/resolvers-crud.index";
import * as argsTypes from "./resolvers/crud/args.index";
import * as actionResolvers from "./resolvers/crud/resolvers-actions.index";
import * as relationResolvers from "./resolvers/relations/resolvers.index";
import * as models from "./models";
import * as outputTypes from "./resolvers/outputs";
import * as inputTypes from "./resolvers/inputs";

export type MethodDecoratorOverrideFn = (decorators: MethodDecorator[]) => MethodDecorator[];

const crudResolversMap = {
  State: crudResolvers.StateCrudResolver,
  Transaction: crudResolvers.TransactionCrudResolver,
  TransactionExecutionResult: crudResolvers.TransactionExecutionResultCrudResolver,
  Block: crudResolvers.BlockCrudResolver,
  Batch: crudResolvers.BatchCrudResolver,
  BlockResult: crudResolvers.BlockResultCrudResolver,
  Settlement: crudResolvers.SettlementCrudResolver,
  IncomingMessageBatchTransaction: crudResolvers.IncomingMessageBatchTransactionCrudResolver,
  IncomingMessageBatch: crudResolvers.IncomingMessageBatchCrudResolver
};
const actionResolversMap = {
  State: {
    aggregateState: actionResolvers.AggregateStateResolver,
    createManyState: actionResolvers.CreateManyStateResolver,
    createManyAndReturnState: actionResolvers.CreateManyAndReturnStateResolver,
    createOneState: actionResolvers.CreateOneStateResolver,
    deleteManyState: actionResolvers.DeleteManyStateResolver,
    deleteOneState: actionResolvers.DeleteOneStateResolver,
    findFirstState: actionResolvers.FindFirstStateResolver,
    findFirstStateOrThrow: actionResolvers.FindFirstStateOrThrowResolver,
    states: actionResolvers.FindManyStateResolver,
    state: actionResolvers.FindUniqueStateResolver,
    getState: actionResolvers.FindUniqueStateOrThrowResolver,
    groupByState: actionResolvers.GroupByStateResolver,
    updateManyState: actionResolvers.UpdateManyStateResolver,
    updateOneState: actionResolvers.UpdateOneStateResolver,
    upsertOneState: actionResolvers.UpsertOneStateResolver
  },
  Transaction: {
    aggregateTransaction: actionResolvers.AggregateTransactionResolver,
    createManyTransaction: actionResolvers.CreateManyTransactionResolver,
    createManyAndReturnTransaction: actionResolvers.CreateManyAndReturnTransactionResolver,
    createOneTransaction: actionResolvers.CreateOneTransactionResolver,
    deleteManyTransaction: actionResolvers.DeleteManyTransactionResolver,
    deleteOneTransaction: actionResolvers.DeleteOneTransactionResolver,
    findFirstTransaction: actionResolvers.FindFirstTransactionResolver,
    findFirstTransactionOrThrow: actionResolvers.FindFirstTransactionOrThrowResolver,
    transactions: actionResolvers.FindManyTransactionResolver,
    transaction: actionResolvers.FindUniqueTransactionResolver,
    getTransaction: actionResolvers.FindUniqueTransactionOrThrowResolver,
    groupByTransaction: actionResolvers.GroupByTransactionResolver,
    updateManyTransaction: actionResolvers.UpdateManyTransactionResolver,
    updateOneTransaction: actionResolvers.UpdateOneTransactionResolver,
    upsertOneTransaction: actionResolvers.UpsertOneTransactionResolver
  },
  TransactionExecutionResult: {
    aggregateTransactionExecutionResult: actionResolvers.AggregateTransactionExecutionResultResolver,
    createManyTransactionExecutionResult: actionResolvers.CreateManyTransactionExecutionResultResolver,
    createManyAndReturnTransactionExecutionResult: actionResolvers.CreateManyAndReturnTransactionExecutionResultResolver,
    createOneTransactionExecutionResult: actionResolvers.CreateOneTransactionExecutionResultResolver,
    deleteManyTransactionExecutionResult: actionResolvers.DeleteManyTransactionExecutionResultResolver,
    deleteOneTransactionExecutionResult: actionResolvers.DeleteOneTransactionExecutionResultResolver,
    findFirstTransactionExecutionResult: actionResolvers.FindFirstTransactionExecutionResultResolver,
    findFirstTransactionExecutionResultOrThrow: actionResolvers.FindFirstTransactionExecutionResultOrThrowResolver,
    transactionExecutionResults: actionResolvers.FindManyTransactionExecutionResultResolver,
    transactionExecutionResult: actionResolvers.FindUniqueTransactionExecutionResultResolver,
    getTransactionExecutionResult: actionResolvers.FindUniqueTransactionExecutionResultOrThrowResolver,
    groupByTransactionExecutionResult: actionResolvers.GroupByTransactionExecutionResultResolver,
    updateManyTransactionExecutionResult: actionResolvers.UpdateManyTransactionExecutionResultResolver,
    updateOneTransactionExecutionResult: actionResolvers.UpdateOneTransactionExecutionResultResolver,
    upsertOneTransactionExecutionResult: actionResolvers.UpsertOneTransactionExecutionResultResolver
  },
  Block: {
    aggregateBlock: actionResolvers.AggregateBlockResolver,
    createManyBlock: actionResolvers.CreateManyBlockResolver,
    createManyAndReturnBlock: actionResolvers.CreateManyAndReturnBlockResolver,
    createOneBlock: actionResolvers.CreateOneBlockResolver,
    deleteManyBlock: actionResolvers.DeleteManyBlockResolver,
    deleteOneBlock: actionResolvers.DeleteOneBlockResolver,
    findFirstBlock: actionResolvers.FindFirstBlockResolver,
    findFirstBlockOrThrow: actionResolvers.FindFirstBlockOrThrowResolver,
    blocks: actionResolvers.FindManyBlockResolver,
    block: actionResolvers.FindUniqueBlockResolver,
    getBlock: actionResolvers.FindUniqueBlockOrThrowResolver,
    groupByBlock: actionResolvers.GroupByBlockResolver,
    updateManyBlock: actionResolvers.UpdateManyBlockResolver,
    updateOneBlock: actionResolvers.UpdateOneBlockResolver,
    upsertOneBlock: actionResolvers.UpsertOneBlockResolver
  },
  Batch: {
    aggregateBatch: actionResolvers.AggregateBatchResolver,
    createManyBatch: actionResolvers.CreateManyBatchResolver,
    createManyAndReturnBatch: actionResolvers.CreateManyAndReturnBatchResolver,
    createOneBatch: actionResolvers.CreateOneBatchResolver,
    deleteManyBatch: actionResolvers.DeleteManyBatchResolver,
    deleteOneBatch: actionResolvers.DeleteOneBatchResolver,
    findFirstBatch: actionResolvers.FindFirstBatchResolver,
    findFirstBatchOrThrow: actionResolvers.FindFirstBatchOrThrowResolver,
    batches: actionResolvers.FindManyBatchResolver,
    batch: actionResolvers.FindUniqueBatchResolver,
    getBatch: actionResolvers.FindUniqueBatchOrThrowResolver,
    groupByBatch: actionResolvers.GroupByBatchResolver,
    updateManyBatch: actionResolvers.UpdateManyBatchResolver,
    updateOneBatch: actionResolvers.UpdateOneBatchResolver,
    upsertOneBatch: actionResolvers.UpsertOneBatchResolver
  },
  BlockResult: {
    aggregateBlockResult: actionResolvers.AggregateBlockResultResolver,
    createManyBlockResult: actionResolvers.CreateManyBlockResultResolver,
    createManyAndReturnBlockResult: actionResolvers.CreateManyAndReturnBlockResultResolver,
    createOneBlockResult: actionResolvers.CreateOneBlockResultResolver,
    deleteManyBlockResult: actionResolvers.DeleteManyBlockResultResolver,
    deleteOneBlockResult: actionResolvers.DeleteOneBlockResultResolver,
    findFirstBlockResult: actionResolvers.FindFirstBlockResultResolver,
    findFirstBlockResultOrThrow: actionResolvers.FindFirstBlockResultOrThrowResolver,
    blockResults: actionResolvers.FindManyBlockResultResolver,
    blockResult: actionResolvers.FindUniqueBlockResultResolver,
    getBlockResult: actionResolvers.FindUniqueBlockResultOrThrowResolver,
    groupByBlockResult: actionResolvers.GroupByBlockResultResolver,
    updateManyBlockResult: actionResolvers.UpdateManyBlockResultResolver,
    updateOneBlockResult: actionResolvers.UpdateOneBlockResultResolver,
    upsertOneBlockResult: actionResolvers.UpsertOneBlockResultResolver
  },
  Settlement: {
    aggregateSettlement: actionResolvers.AggregateSettlementResolver,
    createManySettlement: actionResolvers.CreateManySettlementResolver,
    createManyAndReturnSettlement: actionResolvers.CreateManyAndReturnSettlementResolver,
    createOneSettlement: actionResolvers.CreateOneSettlementResolver,
    deleteManySettlement: actionResolvers.DeleteManySettlementResolver,
    deleteOneSettlement: actionResolvers.DeleteOneSettlementResolver,
    findFirstSettlement: actionResolvers.FindFirstSettlementResolver,
    findFirstSettlementOrThrow: actionResolvers.FindFirstSettlementOrThrowResolver,
    settlements: actionResolvers.FindManySettlementResolver,
    settlement: actionResolvers.FindUniqueSettlementResolver,
    getSettlement: actionResolvers.FindUniqueSettlementOrThrowResolver,
    groupBySettlement: actionResolvers.GroupBySettlementResolver,
    updateManySettlement: actionResolvers.UpdateManySettlementResolver,
    updateOneSettlement: actionResolvers.UpdateOneSettlementResolver,
    upsertOneSettlement: actionResolvers.UpsertOneSettlementResolver
  },
  IncomingMessageBatchTransaction: {
    aggregateIncomingMessageBatchTransaction: actionResolvers.AggregateIncomingMessageBatchTransactionResolver,
    createManyIncomingMessageBatchTransaction: actionResolvers.CreateManyIncomingMessageBatchTransactionResolver,
    createManyAndReturnIncomingMessageBatchTransaction: actionResolvers.CreateManyAndReturnIncomingMessageBatchTransactionResolver,
    createOneIncomingMessageBatchTransaction: actionResolvers.CreateOneIncomingMessageBatchTransactionResolver,
    deleteManyIncomingMessageBatchTransaction: actionResolvers.DeleteManyIncomingMessageBatchTransactionResolver,
    deleteOneIncomingMessageBatchTransaction: actionResolvers.DeleteOneIncomingMessageBatchTransactionResolver,
    findFirstIncomingMessageBatchTransaction: actionResolvers.FindFirstIncomingMessageBatchTransactionResolver,
    findFirstIncomingMessageBatchTransactionOrThrow: actionResolvers.FindFirstIncomingMessageBatchTransactionOrThrowResolver,
    incomingMessageBatchTransactions: actionResolvers.FindManyIncomingMessageBatchTransactionResolver,
    incomingMessageBatchTransaction: actionResolvers.FindUniqueIncomingMessageBatchTransactionResolver,
    getIncomingMessageBatchTransaction: actionResolvers.FindUniqueIncomingMessageBatchTransactionOrThrowResolver,
    groupByIncomingMessageBatchTransaction: actionResolvers.GroupByIncomingMessageBatchTransactionResolver,
    updateManyIncomingMessageBatchTransaction: actionResolvers.UpdateManyIncomingMessageBatchTransactionResolver,
    updateOneIncomingMessageBatchTransaction: actionResolvers.UpdateOneIncomingMessageBatchTransactionResolver,
    upsertOneIncomingMessageBatchTransaction: actionResolvers.UpsertOneIncomingMessageBatchTransactionResolver
  },
  IncomingMessageBatch: {
    aggregateIncomingMessageBatch: actionResolvers.AggregateIncomingMessageBatchResolver,
    createManyIncomingMessageBatch: actionResolvers.CreateManyIncomingMessageBatchResolver,
    createManyAndReturnIncomingMessageBatch: actionResolvers.CreateManyAndReturnIncomingMessageBatchResolver,
    createOneIncomingMessageBatch: actionResolvers.CreateOneIncomingMessageBatchResolver,
    deleteManyIncomingMessageBatch: actionResolvers.DeleteManyIncomingMessageBatchResolver,
    deleteOneIncomingMessageBatch: actionResolvers.DeleteOneIncomingMessageBatchResolver,
    findFirstIncomingMessageBatch: actionResolvers.FindFirstIncomingMessageBatchResolver,
    findFirstIncomingMessageBatchOrThrow: actionResolvers.FindFirstIncomingMessageBatchOrThrowResolver,
    incomingMessageBatches: actionResolvers.FindManyIncomingMessageBatchResolver,
    incomingMessageBatch: actionResolvers.FindUniqueIncomingMessageBatchResolver,
    getIncomingMessageBatch: actionResolvers.FindUniqueIncomingMessageBatchOrThrowResolver,
    groupByIncomingMessageBatch: actionResolvers.GroupByIncomingMessageBatchResolver,
    updateManyIncomingMessageBatch: actionResolvers.UpdateManyIncomingMessageBatchResolver,
    updateOneIncomingMessageBatch: actionResolvers.UpdateOneIncomingMessageBatchResolver,
    upsertOneIncomingMessageBatch: actionResolvers.UpsertOneIncomingMessageBatchResolver
  }
};
const crudResolversInfo = {
  State: ["aggregateState", "createManyState", "createManyAndReturnState", "createOneState", "deleteManyState", "deleteOneState", "findFirstState", "findFirstStateOrThrow", "states", "state", "getState", "groupByState", "updateManyState", "updateOneState", "upsertOneState"],
  Transaction: ["aggregateTransaction", "createManyTransaction", "createManyAndReturnTransaction", "createOneTransaction", "deleteManyTransaction", "deleteOneTransaction", "findFirstTransaction", "findFirstTransactionOrThrow", "transactions", "transaction", "getTransaction", "groupByTransaction", "updateManyTransaction", "updateOneTransaction", "upsertOneTransaction"],
  TransactionExecutionResult: ["aggregateTransactionExecutionResult", "createManyTransactionExecutionResult", "createManyAndReturnTransactionExecutionResult", "createOneTransactionExecutionResult", "deleteManyTransactionExecutionResult", "deleteOneTransactionExecutionResult", "findFirstTransactionExecutionResult", "findFirstTransactionExecutionResultOrThrow", "transactionExecutionResults", "transactionExecutionResult", "getTransactionExecutionResult", "groupByTransactionExecutionResult", "updateManyTransactionExecutionResult", "updateOneTransactionExecutionResult", "upsertOneTransactionExecutionResult"],
  Block: ["aggregateBlock", "createManyBlock", "createManyAndReturnBlock", "createOneBlock", "deleteManyBlock", "deleteOneBlock", "findFirstBlock", "findFirstBlockOrThrow", "blocks", "block", "getBlock", "groupByBlock", "updateManyBlock", "updateOneBlock", "upsertOneBlock"],
  Batch: ["aggregateBatch", "createManyBatch", "createManyAndReturnBatch", "createOneBatch", "deleteManyBatch", "deleteOneBatch", "findFirstBatch", "findFirstBatchOrThrow", "batches", "batch", "getBatch", "groupByBatch", "updateManyBatch", "updateOneBatch", "upsertOneBatch"],
  BlockResult: ["aggregateBlockResult", "createManyBlockResult", "createManyAndReturnBlockResult", "createOneBlockResult", "deleteManyBlockResult", "deleteOneBlockResult", "findFirstBlockResult", "findFirstBlockResultOrThrow", "blockResults", "blockResult", "getBlockResult", "groupByBlockResult", "updateManyBlockResult", "updateOneBlockResult", "upsertOneBlockResult"],
  Settlement: ["aggregateSettlement", "createManySettlement", "createManyAndReturnSettlement", "createOneSettlement", "deleteManySettlement", "deleteOneSettlement", "findFirstSettlement", "findFirstSettlementOrThrow", "settlements", "settlement", "getSettlement", "groupBySettlement", "updateManySettlement", "updateOneSettlement", "upsertOneSettlement"],
  IncomingMessageBatchTransaction: ["aggregateIncomingMessageBatchTransaction", "createManyIncomingMessageBatchTransaction", "createManyAndReturnIncomingMessageBatchTransaction", "createOneIncomingMessageBatchTransaction", "deleteManyIncomingMessageBatchTransaction", "deleteOneIncomingMessageBatchTransaction", "findFirstIncomingMessageBatchTransaction", "findFirstIncomingMessageBatchTransactionOrThrow", "incomingMessageBatchTransactions", "incomingMessageBatchTransaction", "getIncomingMessageBatchTransaction", "groupByIncomingMessageBatchTransaction", "updateManyIncomingMessageBatchTransaction", "updateOneIncomingMessageBatchTransaction", "upsertOneIncomingMessageBatchTransaction"],
  IncomingMessageBatch: ["aggregateIncomingMessageBatch", "createManyIncomingMessageBatch", "createManyAndReturnIncomingMessageBatch", "createOneIncomingMessageBatch", "deleteManyIncomingMessageBatch", "deleteOneIncomingMessageBatch", "findFirstIncomingMessageBatch", "findFirstIncomingMessageBatchOrThrow", "incomingMessageBatches", "incomingMessageBatch", "getIncomingMessageBatch", "groupByIncomingMessageBatch", "updateManyIncomingMessageBatch", "updateOneIncomingMessageBatch", "upsertOneIncomingMessageBatch"]
};
const argsInfo = {
  AggregateStateArgs: ["where", "orderBy", "cursor", "take", "skip"],
  CreateManyStateArgs: ["data", "skipDuplicates"],
  CreateManyAndReturnStateArgs: ["data", "skipDuplicates"],
  CreateOneStateArgs: ["data"],
  DeleteManyStateArgs: ["where"],
  DeleteOneStateArgs: ["where"],
  FindFirstStateArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindFirstStateOrThrowArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindManyStateArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniqueStateArgs: ["where"],
  FindUniqueStateOrThrowArgs: ["where"],
  GroupByStateArgs: ["where", "orderBy", "by", "having", "take", "skip"],
  UpdateManyStateArgs: ["data", "where"],
  UpdateOneStateArgs: ["data", "where"],
  UpsertOneStateArgs: ["where", "create", "update"],
  AggregateTransactionArgs: ["where", "orderBy", "cursor", "take", "skip"],
  CreateManyTransactionArgs: ["data", "skipDuplicates"],
  CreateManyAndReturnTransactionArgs: ["data", "skipDuplicates"],
  CreateOneTransactionArgs: ["data"],
  DeleteManyTransactionArgs: ["where"],
  DeleteOneTransactionArgs: ["where"],
  FindFirstTransactionArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindFirstTransactionOrThrowArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindManyTransactionArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniqueTransactionArgs: ["where"],
  FindUniqueTransactionOrThrowArgs: ["where"],
  GroupByTransactionArgs: ["where", "orderBy", "by", "having", "take", "skip"],
  UpdateManyTransactionArgs: ["data", "where"],
  UpdateOneTransactionArgs: ["data", "where"],
  UpsertOneTransactionArgs: ["where", "create", "update"],
  AggregateTransactionExecutionResultArgs: ["where", "orderBy", "cursor", "take", "skip"],
  CreateManyTransactionExecutionResultArgs: ["data", "skipDuplicates"],
  CreateManyAndReturnTransactionExecutionResultArgs: ["data", "skipDuplicates"],
  CreateOneTransactionExecutionResultArgs: ["data"],
  DeleteManyTransactionExecutionResultArgs: ["where"],
  DeleteOneTransactionExecutionResultArgs: ["where"],
  FindFirstTransactionExecutionResultArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindFirstTransactionExecutionResultOrThrowArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindManyTransactionExecutionResultArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniqueTransactionExecutionResultArgs: ["where"],
  FindUniqueTransactionExecutionResultOrThrowArgs: ["where"],
  GroupByTransactionExecutionResultArgs: ["where", "orderBy", "by", "having", "take", "skip"],
  UpdateManyTransactionExecutionResultArgs: ["data", "where"],
  UpdateOneTransactionExecutionResultArgs: ["data", "where"],
  UpsertOneTransactionExecutionResultArgs: ["where", "create", "update"],
  AggregateBlockArgs: ["where", "orderBy", "cursor", "take", "skip"],
  CreateManyBlockArgs: ["data", "skipDuplicates"],
  CreateManyAndReturnBlockArgs: ["data", "skipDuplicates"],
  CreateOneBlockArgs: ["data"],
  DeleteManyBlockArgs: ["where"],
  DeleteOneBlockArgs: ["where"],
  FindFirstBlockArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindFirstBlockOrThrowArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindManyBlockArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniqueBlockArgs: ["where"],
  FindUniqueBlockOrThrowArgs: ["where"],
  GroupByBlockArgs: ["where", "orderBy", "by", "having", "take", "skip"],
  UpdateManyBlockArgs: ["data", "where"],
  UpdateOneBlockArgs: ["data", "where"],
  UpsertOneBlockArgs: ["where", "create", "update"],
  AggregateBatchArgs: ["where", "orderBy", "cursor", "take", "skip"],
  CreateManyBatchArgs: ["data", "skipDuplicates"],
  CreateManyAndReturnBatchArgs: ["data", "skipDuplicates"],
  CreateOneBatchArgs: ["data"],
  DeleteManyBatchArgs: ["where"],
  DeleteOneBatchArgs: ["where"],
  FindFirstBatchArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindFirstBatchOrThrowArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindManyBatchArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniqueBatchArgs: ["where"],
  FindUniqueBatchOrThrowArgs: ["where"],
  GroupByBatchArgs: ["where", "orderBy", "by", "having", "take", "skip"],
  UpdateManyBatchArgs: ["data", "where"],
  UpdateOneBatchArgs: ["data", "where"],
  UpsertOneBatchArgs: ["where", "create", "update"],
  AggregateBlockResultArgs: ["where", "orderBy", "cursor", "take", "skip"],
  CreateManyBlockResultArgs: ["data", "skipDuplicates"],
  CreateManyAndReturnBlockResultArgs: ["data", "skipDuplicates"],
  CreateOneBlockResultArgs: ["data"],
  DeleteManyBlockResultArgs: ["where"],
  DeleteOneBlockResultArgs: ["where"],
  FindFirstBlockResultArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindFirstBlockResultOrThrowArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindManyBlockResultArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniqueBlockResultArgs: ["where"],
  FindUniqueBlockResultOrThrowArgs: ["where"],
  GroupByBlockResultArgs: ["where", "orderBy", "by", "having", "take", "skip"],
  UpdateManyBlockResultArgs: ["data", "where"],
  UpdateOneBlockResultArgs: ["data", "where"],
  UpsertOneBlockResultArgs: ["where", "create", "update"],
  AggregateSettlementArgs: ["where", "orderBy", "cursor", "take", "skip"],
  CreateManySettlementArgs: ["data", "skipDuplicates"],
  CreateManyAndReturnSettlementArgs: ["data", "skipDuplicates"],
  CreateOneSettlementArgs: ["data"],
  DeleteManySettlementArgs: ["where"],
  DeleteOneSettlementArgs: ["where"],
  FindFirstSettlementArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindFirstSettlementOrThrowArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindManySettlementArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniqueSettlementArgs: ["where"],
  FindUniqueSettlementOrThrowArgs: ["where"],
  GroupBySettlementArgs: ["where", "orderBy", "by", "having", "take", "skip"],
  UpdateManySettlementArgs: ["data", "where"],
  UpdateOneSettlementArgs: ["data", "where"],
  UpsertOneSettlementArgs: ["where", "create", "update"],
  AggregateIncomingMessageBatchTransactionArgs: ["where", "orderBy", "cursor", "take", "skip"],
  CreateManyIncomingMessageBatchTransactionArgs: ["data", "skipDuplicates"],
  CreateManyAndReturnIncomingMessageBatchTransactionArgs: ["data", "skipDuplicates"],
  CreateOneIncomingMessageBatchTransactionArgs: ["data"],
  DeleteManyIncomingMessageBatchTransactionArgs: ["where"],
  DeleteOneIncomingMessageBatchTransactionArgs: ["where"],
  FindFirstIncomingMessageBatchTransactionArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindFirstIncomingMessageBatchTransactionOrThrowArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindManyIncomingMessageBatchTransactionArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniqueIncomingMessageBatchTransactionArgs: ["where"],
  FindUniqueIncomingMessageBatchTransactionOrThrowArgs: ["where"],
  GroupByIncomingMessageBatchTransactionArgs: ["where", "orderBy", "by", "having", "take", "skip"],
  UpdateManyIncomingMessageBatchTransactionArgs: ["data", "where"],
  UpdateOneIncomingMessageBatchTransactionArgs: ["data", "where"],
  UpsertOneIncomingMessageBatchTransactionArgs: ["where", "create", "update"],
  AggregateIncomingMessageBatchArgs: ["where", "orderBy", "cursor", "take", "skip"],
  CreateManyIncomingMessageBatchArgs: ["data", "skipDuplicates"],
  CreateManyAndReturnIncomingMessageBatchArgs: ["data", "skipDuplicates"],
  CreateOneIncomingMessageBatchArgs: ["data"],
  DeleteManyIncomingMessageBatchArgs: ["where"],
  DeleteOneIncomingMessageBatchArgs: ["where"],
  FindFirstIncomingMessageBatchArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindFirstIncomingMessageBatchOrThrowArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindManyIncomingMessageBatchArgs: ["where", "orderBy", "cursor", "take", "skip", "distinct"],
  FindUniqueIncomingMessageBatchArgs: ["where"],
  FindUniqueIncomingMessageBatchOrThrowArgs: ["where"],
  GroupByIncomingMessageBatchArgs: ["where", "orderBy", "by", "having", "take", "skip"],
  UpdateManyIncomingMessageBatchArgs: ["data", "where"],
  UpdateOneIncomingMessageBatchArgs: ["data", "where"],
  UpsertOneIncomingMessageBatchArgs: ["where", "create", "update"]
};

type ResolverModelNames = keyof typeof crudResolversMap;

type ModelResolverActionNames<
  TModel extends ResolverModelNames
> = keyof typeof crudResolversMap[TModel]["prototype"];

export type ResolverActionsConfig<
  TModel extends ResolverModelNames
> = Partial<Record<ModelResolverActionNames<TModel>, MethodDecorator[] | MethodDecoratorOverrideFn>>
  & {
    _all?: MethodDecorator[];
    _query?: MethodDecorator[];
    _mutation?: MethodDecorator[];
  };

export type ResolversEnhanceMap = {
  [TModel in ResolverModelNames]?: ResolverActionsConfig<TModel>;
};

export function applyResolversEnhanceMap(
  resolversEnhanceMap: ResolversEnhanceMap,
) {
  const mutationOperationPrefixes = [
    "createOne", "createMany", "createManyAndReturn", "deleteOne", "updateOne", "deleteMany", "updateMany", "upsertOne"
  ];
  for (const resolversEnhanceMapKey of Object.keys(resolversEnhanceMap)) {
    const modelName = resolversEnhanceMapKey as keyof typeof resolversEnhanceMap;
    const crudTarget = crudResolversMap[modelName].prototype;
    const resolverActionsConfig = resolversEnhanceMap[modelName]!;
    const actionResolversConfig = actionResolversMap[modelName];
    const allActionsDecorators = resolverActionsConfig._all;
    const resolverActionNames = crudResolversInfo[modelName as keyof typeof crudResolversInfo];
    for (const resolverActionName of resolverActionNames) {
      const maybeDecoratorsOrFn = resolverActionsConfig[
        resolverActionName as keyof typeof resolverActionsConfig
      ] as MethodDecorator[] | MethodDecoratorOverrideFn | undefined;
      const isWriteOperation = mutationOperationPrefixes.some(prefix => resolverActionName.startsWith(prefix));
      const operationKindDecorators = isWriteOperation ? resolverActionsConfig._mutation : resolverActionsConfig._query;
      const mainDecorators = [
        ...allActionsDecorators ?? [],
        ...operationKindDecorators ?? [],
      ]
      let decorators: MethodDecorator[];
      if (typeof maybeDecoratorsOrFn === "function") {
        decorators = maybeDecoratorsOrFn(mainDecorators);
      } else {
        decorators = [...mainDecorators, ...maybeDecoratorsOrFn ?? []];
      }
      const actionTarget = (actionResolversConfig[
        resolverActionName as keyof typeof actionResolversConfig
      ] as Function).prototype;
      tslib.__decorate(decorators, crudTarget, resolverActionName, null);
      tslib.__decorate(decorators, actionTarget, resolverActionName, null);
    }
  }
}

type ArgsTypesNames = keyof typeof argsTypes;

type ArgFieldNames<TArgsType extends ArgsTypesNames> = Exclude<
  keyof typeof argsTypes[TArgsType]["prototype"],
  number | symbol
>;

type ArgFieldsConfig<
  TArgsType extends ArgsTypesNames
> = FieldsConfig<ArgFieldNames<TArgsType>>;

export type ArgConfig<TArgsType extends ArgsTypesNames> = {
  class?: ClassDecorator[];
  fields?: ArgFieldsConfig<TArgsType>;
};

export type ArgsTypesEnhanceMap = {
  [TArgsType in ArgsTypesNames]?: ArgConfig<TArgsType>;
};

export function applyArgsTypesEnhanceMap(
  argsTypesEnhanceMap: ArgsTypesEnhanceMap,
) {
  for (const argsTypesEnhanceMapKey of Object.keys(argsTypesEnhanceMap)) {
    const argsTypeName = argsTypesEnhanceMapKey as keyof typeof argsTypesEnhanceMap;
    const typeConfig = argsTypesEnhanceMap[argsTypeName]!;
    const typeClass = argsTypes[argsTypeName];
    const typeTarget = typeClass.prototype;
    applyTypeClassEnhanceConfig(
      typeConfig,
      typeClass,
      typeTarget,
      argsInfo[argsTypeName as keyof typeof argsInfo],
    );
  }
}

const relationResolversMap = {
  Transaction: relationResolvers.TransactionRelationsResolver,
  TransactionExecutionResult: relationResolvers.TransactionExecutionResultRelationsResolver,
  Block: relationResolvers.BlockRelationsResolver,
  Batch: relationResolvers.BatchRelationsResolver,
  BlockResult: relationResolvers.BlockResultRelationsResolver,
  Settlement: relationResolvers.SettlementRelationsResolver,
  IncomingMessageBatchTransaction: relationResolvers.IncomingMessageBatchTransactionRelationsResolver,
  IncomingMessageBatch: relationResolvers.IncomingMessageBatchRelationsResolver
};
const relationResolversInfo = {
  Transaction: ["executionResult", "IncomingMessageBatchTransaction"],
  TransactionExecutionResult: ["tx", "block"],
  Block: ["parent", "successor", "transactions", "result", "batch"],
  Batch: ["blocks", "settlement"],
  BlockResult: ["block"],
  Settlement: ["batches"],
  IncomingMessageBatchTransaction: ["transaction", "batch"],
  IncomingMessageBatch: ["messages"]
};

type RelationResolverModelNames = keyof typeof relationResolversMap;

type RelationResolverActionNames<
  TModel extends RelationResolverModelNames
> = keyof typeof relationResolversMap[TModel]["prototype"];

export type RelationResolverActionsConfig<TModel extends RelationResolverModelNames>
  = Partial<Record<RelationResolverActionNames<TModel>, MethodDecorator[] | MethodDecoratorOverrideFn>>
  & { _all?: MethodDecorator[] };

export type RelationResolversEnhanceMap = {
  [TModel in RelationResolverModelNames]?: RelationResolverActionsConfig<TModel>;
};

export function applyRelationResolversEnhanceMap(
  relationResolversEnhanceMap: RelationResolversEnhanceMap,
) {
  for (const relationResolversEnhanceMapKey of Object.keys(relationResolversEnhanceMap)) {
    const modelName = relationResolversEnhanceMapKey as keyof typeof relationResolversEnhanceMap;
    const relationResolverTarget = relationResolversMap[modelName].prototype;
    const relationResolverActionsConfig = relationResolversEnhanceMap[modelName]!;
    const allActionsDecorators = relationResolverActionsConfig._all ?? [];
    const relationResolverActionNames = relationResolversInfo[modelName as keyof typeof relationResolversInfo];
    for (const relationResolverActionName of relationResolverActionNames) {
      const maybeDecoratorsOrFn = relationResolverActionsConfig[
        relationResolverActionName as keyof typeof relationResolverActionsConfig
      ] as MethodDecorator[] | MethodDecoratorOverrideFn | undefined;
      let decorators: MethodDecorator[];
      if (typeof maybeDecoratorsOrFn === "function") {
        decorators = maybeDecoratorsOrFn(allActionsDecorators);
      } else {
        decorators = [...allActionsDecorators, ...maybeDecoratorsOrFn ?? []];
      }
      tslib.__decorate(decorators, relationResolverTarget, relationResolverActionName, null);
    }
  }
}

type TypeConfig = {
  class?: ClassDecorator[];
  fields?: FieldsConfig;
};

export type PropertyDecoratorOverrideFn = (decorators: PropertyDecorator[]) => PropertyDecorator[];

type FieldsConfig<TTypeKeys extends string = string> = Partial<
  Record<TTypeKeys, PropertyDecorator[] | PropertyDecoratorOverrideFn>
> & { _all?: PropertyDecorator[] };

function applyTypeClassEnhanceConfig<
  TEnhanceConfig extends TypeConfig,
  TType extends object
>(
  enhanceConfig: TEnhanceConfig,
  typeClass: ClassType<TType>,
  typePrototype: TType,
  typeFieldNames: string[]
) {
  if (enhanceConfig.class) {
    tslib.__decorate(enhanceConfig.class, typeClass);
  }
  if (enhanceConfig.fields) {
    const allFieldsDecorators = enhanceConfig.fields._all ?? [];
    for (const typeFieldName of typeFieldNames) {
      const maybeDecoratorsOrFn = enhanceConfig.fields[
        typeFieldName
      ] as PropertyDecorator[] | PropertyDecoratorOverrideFn | undefined;
      let decorators: PropertyDecorator[];
      if (typeof maybeDecoratorsOrFn === "function") {
        decorators = maybeDecoratorsOrFn(allFieldsDecorators);
      } else {
        decorators = [...allFieldsDecorators, ...maybeDecoratorsOrFn ?? []];
      }
      tslib.__decorate(decorators, typePrototype, typeFieldName, void 0);
    }
  }
}

const modelsInfo = {
  State: ["path", "values", "mask"],
  Transaction: ["hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage"],
  TransactionExecutionResult: ["stateTransitions", "protocolTransitions", "status", "statusMessage", "txHash", "blockHash"],
  Block: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash", "batchHeight"],
  Batch: ["height", "proof", "settlementTransactionHash"],
  BlockResult: ["blockHash", "stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness"],
  Settlement: ["transactionHash", "promisedMessagesHash"],
  IncomingMessageBatchTransaction: ["transactionHash", "batchId"],
  IncomingMessageBatch: ["id", "fromMessageHash", "toMessageHash"]
};

type ModelNames = keyof typeof models;

type ModelFieldNames<TModel extends ModelNames> = Exclude<
  keyof typeof models[TModel]["prototype"],
  number | symbol
>;

type ModelFieldsConfig<TModel extends ModelNames> = FieldsConfig<
  ModelFieldNames<TModel>
>;

export type ModelConfig<TModel extends ModelNames> = {
  class?: ClassDecorator[];
  fields?: ModelFieldsConfig<TModel>;
};

export type ModelsEnhanceMap = {
  [TModel in ModelNames]?: ModelConfig<TModel>;
};

export function applyModelsEnhanceMap(modelsEnhanceMap: ModelsEnhanceMap) {
  for (const modelsEnhanceMapKey of Object.keys(modelsEnhanceMap)) {
    const modelName = modelsEnhanceMapKey as keyof typeof modelsEnhanceMap;
    const modelConfig = modelsEnhanceMap[modelName]!;
    const modelClass = models[modelName];
    const modelTarget = modelClass.prototype;
    applyTypeClassEnhanceConfig(
      modelConfig,
      modelClass,
      modelTarget,
      modelsInfo[modelName as keyof typeof modelsInfo],
    );
  }
}

const outputsInfo = {
  AggregateState: ["_count", "_avg", "_sum", "_min", "_max"],
  StateGroupBy: ["path", "values", "mask", "_count", "_avg", "_sum", "_min", "_max"],
  AggregateTransaction: ["_count", "_min", "_max"],
  TransactionGroupBy: ["hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage", "_count", "_min", "_max"],
  AggregateTransactionExecutionResult: ["_count", "_min", "_max"],
  TransactionExecutionResultGroupBy: ["stateTransitions", "protocolTransitions", "status", "statusMessage", "txHash", "blockHash", "_count", "_min", "_max"],
  AggregateBlock: ["_count", "_avg", "_sum", "_min", "_max"],
  BlockGroupBy: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash", "batchHeight", "_count", "_avg", "_sum", "_min", "_max"],
  AggregateBatch: ["_count", "_avg", "_sum", "_min", "_max"],
  BatchGroupBy: ["height", "proof", "settlementTransactionHash", "_count", "_avg", "_sum", "_min", "_max"],
  AggregateBlockResult: ["_count", "_min", "_max"],
  BlockResultGroupBy: ["blockHash", "stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness", "_count", "_min", "_max"],
  AggregateSettlement: ["_count", "_min", "_max"],
  SettlementGroupBy: ["transactionHash", "promisedMessagesHash", "_count", "_min", "_max"],
  AggregateIncomingMessageBatchTransaction: ["_count", "_avg", "_sum", "_min", "_max"],
  IncomingMessageBatchTransactionGroupBy: ["transactionHash", "batchId", "_count", "_avg", "_sum", "_min", "_max"],
  AggregateIncomingMessageBatch: ["_count", "_avg", "_sum", "_min", "_max"],
  IncomingMessageBatchGroupBy: ["id", "fromMessageHash", "toMessageHash", "_count", "_avg", "_sum", "_min", "_max"],
  AffectedRowsOutput: ["count"],
  StateCountAggregate: ["path", "values", "mask", "_all"],
  StateAvgAggregate: ["path", "values"],
  StateSumAggregate: ["path", "values"],
  StateMinAggregate: ["path", "mask"],
  StateMaxAggregate: ["path", "mask"],
  TransactionCount: ["IncomingMessageBatchTransaction"],
  TransactionCountAggregate: ["hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage", "_all"],
  TransactionMinAggregate: ["hash", "methodId", "sender", "nonce", "signature_r", "signature_s", "isMessage"],
  TransactionMaxAggregate: ["hash", "methodId", "sender", "nonce", "signature_r", "signature_s", "isMessage"],
  TransactionExecutionResultCountAggregate: ["stateTransitions", "protocolTransitions", "status", "statusMessage", "txHash", "blockHash", "_all"],
  TransactionExecutionResultMinAggregate: ["status", "statusMessage", "txHash", "blockHash"],
  TransactionExecutionResultMaxAggregate: ["status", "statusMessage", "txHash", "blockHash"],
  BlockCount: ["transactions"],
  BlockCountAggregate: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash", "batchHeight", "_all"],
  BlockAvgAggregate: ["height", "batchHeight"],
  BlockSumAggregate: ["height", "batchHeight"],
  BlockMinAggregate: ["hash", "transactionsHash", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash", "batchHeight"],
  BlockMaxAggregate: ["hash", "transactionsHash", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash", "batchHeight"],
  BatchCount: ["blocks"],
  BatchCountAggregate: ["height", "proof", "settlementTransactionHash", "_all"],
  BatchAvgAggregate: ["height"],
  BatchSumAggregate: ["height"],
  BatchMinAggregate: ["height", "settlementTransactionHash"],
  BatchMaxAggregate: ["height", "settlementTransactionHash"],
  BlockResultCountAggregate: ["blockHash", "stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness", "_all"],
  BlockResultMinAggregate: ["blockHash", "stateRoot", "blockHashRoot"],
  BlockResultMaxAggregate: ["blockHash", "stateRoot", "blockHashRoot"],
  SettlementCount: ["batches"],
  SettlementCountAggregate: ["transactionHash", "promisedMessagesHash", "_all"],
  SettlementMinAggregate: ["transactionHash", "promisedMessagesHash"],
  SettlementMaxAggregate: ["transactionHash", "promisedMessagesHash"],
  IncomingMessageBatchTransactionCountAggregate: ["transactionHash", "batchId", "_all"],
  IncomingMessageBatchTransactionAvgAggregate: ["batchId"],
  IncomingMessageBatchTransactionSumAggregate: ["batchId"],
  IncomingMessageBatchTransactionMinAggregate: ["transactionHash", "batchId"],
  IncomingMessageBatchTransactionMaxAggregate: ["transactionHash", "batchId"],
  IncomingMessageBatchCount: ["messages"],
  IncomingMessageBatchCountAggregate: ["id", "fromMessageHash", "toMessageHash", "_all"],
  IncomingMessageBatchAvgAggregate: ["id"],
  IncomingMessageBatchSumAggregate: ["id"],
  IncomingMessageBatchMinAggregate: ["id", "fromMessageHash", "toMessageHash"],
  IncomingMessageBatchMaxAggregate: ["id", "fromMessageHash", "toMessageHash"],
  CreateManyAndReturnState: ["path", "values", "mask"],
  CreateManyAndReturnTransaction: ["hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage"],
  CreateManyAndReturnTransactionExecutionResult: ["stateTransitions", "protocolTransitions", "status", "statusMessage", "txHash", "blockHash", "tx", "block"],
  CreateManyAndReturnBlock: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash", "batchHeight", "parent", "batch"],
  CreateManyAndReturnBatch: ["height", "proof", "settlementTransactionHash", "settlement"],
  CreateManyAndReturnBlockResult: ["blockHash", "stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness", "block"],
  CreateManyAndReturnSettlement: ["transactionHash", "promisedMessagesHash"],
  CreateManyAndReturnIncomingMessageBatchTransaction: ["transactionHash", "batchId", "transaction", "batch"],
  CreateManyAndReturnIncomingMessageBatch: ["id", "fromMessageHash", "toMessageHash"]
};

type OutputTypesNames = keyof typeof outputTypes;

type OutputTypeFieldNames<TOutput extends OutputTypesNames> = Exclude<
  keyof typeof outputTypes[TOutput]["prototype"],
  number | symbol
>;

type OutputTypeFieldsConfig<
  TOutput extends OutputTypesNames
> = FieldsConfig<OutputTypeFieldNames<TOutput>>;

export type OutputTypeConfig<TOutput extends OutputTypesNames> = {
  class?: ClassDecorator[];
  fields?: OutputTypeFieldsConfig<TOutput>;
};

export type OutputTypesEnhanceMap = {
  [TOutput in OutputTypesNames]?: OutputTypeConfig<TOutput>;
};

export function applyOutputTypesEnhanceMap(
  outputTypesEnhanceMap: OutputTypesEnhanceMap,
) {
  for (const outputTypeEnhanceMapKey of Object.keys(outputTypesEnhanceMap)) {
    const outputTypeName = outputTypeEnhanceMapKey as keyof typeof outputTypesEnhanceMap;
    const typeConfig = outputTypesEnhanceMap[outputTypeName]!;
    const typeClass = outputTypes[outputTypeName];
    const typeTarget = typeClass.prototype;
    applyTypeClassEnhanceConfig(
      typeConfig,
      typeClass,
      typeTarget,
      outputsInfo[outputTypeName as keyof typeof outputsInfo],
    );
  }
}

const inputsInfo = {
  StateWhereInput: ["AND", "OR", "NOT", "path", "values", "mask"],
  StateOrderByWithRelationInput: ["path", "values", "mask"],
  StateWhereUniqueInput: ["path_mask", "AND", "OR", "NOT", "path", "values", "mask"],
  StateOrderByWithAggregationInput: ["path", "values", "mask", "_count", "_avg", "_max", "_min", "_sum"],
  StateScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "path", "values", "mask"],
  TransactionWhereInput: ["AND", "OR", "NOT", "hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage", "executionResult", "IncomingMessageBatchTransaction"],
  TransactionOrderByWithRelationInput: ["hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage", "executionResult", "IncomingMessageBatchTransaction"],
  TransactionWhereUniqueInput: ["hash", "AND", "OR", "NOT", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage", "executionResult", "IncomingMessageBatchTransaction"],
  TransactionOrderByWithAggregationInput: ["hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage", "_count", "_max", "_min"],
  TransactionScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage"],
  TransactionExecutionResultWhereInput: ["AND", "OR", "NOT", "stateTransitions", "protocolTransitions", "status", "statusMessage", "txHash", "blockHash", "tx", "block"],
  TransactionExecutionResultOrderByWithRelationInput: ["stateTransitions", "protocolTransitions", "status", "statusMessage", "txHash", "blockHash", "tx", "block"],
  TransactionExecutionResultWhereUniqueInput: ["txHash", "AND", "OR", "NOT", "stateTransitions", "protocolTransitions", "status", "statusMessage", "blockHash", "tx", "block"],
  TransactionExecutionResultOrderByWithAggregationInput: ["stateTransitions", "protocolTransitions", "status", "statusMessage", "txHash", "blockHash", "_count", "_max", "_min"],
  TransactionExecutionResultScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "stateTransitions", "protocolTransitions", "status", "statusMessage", "txHash", "blockHash"],
  BlockWhereInput: ["AND", "OR", "NOT", "hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash", "batchHeight", "parent", "successor", "transactions", "result", "batch"],
  BlockOrderByWithRelationInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash", "batchHeight", "parent", "successor", "transactions", "result", "batch"],
  BlockWhereUniqueInput: ["hash", "parentHash", "AND", "OR", "NOT", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "batchHeight", "parent", "successor", "transactions", "result", "batch"],
  BlockOrderByWithAggregationInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash", "batchHeight", "_count", "_avg", "_max", "_min", "_sum"],
  BlockScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash", "batchHeight"],
  BatchWhereInput: ["AND", "OR", "NOT", "height", "proof", "settlementTransactionHash", "blocks", "settlement"],
  BatchOrderByWithRelationInput: ["height", "proof", "settlementTransactionHash", "blocks", "settlement"],
  BatchWhereUniqueInput: ["height", "AND", "OR", "NOT", "proof", "settlementTransactionHash", "blocks", "settlement"],
  BatchOrderByWithAggregationInput: ["height", "proof", "settlementTransactionHash", "_count", "_avg", "_max", "_min", "_sum"],
  BatchScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "height", "proof", "settlementTransactionHash"],
  BlockResultWhereInput: ["AND", "OR", "NOT", "blockHash", "stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness", "block"],
  BlockResultOrderByWithRelationInput: ["blockHash", "stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness", "block"],
  BlockResultWhereUniqueInput: ["blockHash", "AND", "OR", "NOT", "stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness", "block"],
  BlockResultOrderByWithAggregationInput: ["blockHash", "stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness", "_count", "_max", "_min"],
  BlockResultScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "blockHash", "stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness"],
  SettlementWhereInput: ["AND", "OR", "NOT", "transactionHash", "promisedMessagesHash", "batches"],
  SettlementOrderByWithRelationInput: ["transactionHash", "promisedMessagesHash", "batches"],
  SettlementWhereUniqueInput: ["transactionHash", "AND", "OR", "NOT", "promisedMessagesHash", "batches"],
  SettlementOrderByWithAggregationInput: ["transactionHash", "promisedMessagesHash", "_count", "_max", "_min"],
  SettlementScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "transactionHash", "promisedMessagesHash"],
  IncomingMessageBatchTransactionWhereInput: ["AND", "OR", "NOT", "transactionHash", "batchId", "transaction", "batch"],
  IncomingMessageBatchTransactionOrderByWithRelationInput: ["transactionHash", "batchId", "transaction", "batch"],
  IncomingMessageBatchTransactionWhereUniqueInput: ["transactionHash_batchId", "AND", "OR", "NOT", "transactionHash", "batchId", "transaction", "batch"],
  IncomingMessageBatchTransactionOrderByWithAggregationInput: ["transactionHash", "batchId", "_count", "_avg", "_max", "_min", "_sum"],
  IncomingMessageBatchTransactionScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "transactionHash", "batchId"],
  IncomingMessageBatchWhereInput: ["AND", "OR", "NOT", "id", "fromMessageHash", "toMessageHash", "messages"],
  IncomingMessageBatchOrderByWithRelationInput: ["id", "fromMessageHash", "toMessageHash", "messages"],
  IncomingMessageBatchWhereUniqueInput: ["id", "AND", "OR", "NOT", "fromMessageHash", "toMessageHash", "messages"],
  IncomingMessageBatchOrderByWithAggregationInput: ["id", "fromMessageHash", "toMessageHash", "_count", "_avg", "_max", "_min", "_sum"],
  IncomingMessageBatchScalarWhereWithAggregatesInput: ["AND", "OR", "NOT", "id", "fromMessageHash", "toMessageHash"],
  StateCreateInput: ["path", "values", "mask"],
  StateUpdateInput: ["path", "values", "mask"],
  StateCreateManyInput: ["path", "values", "mask"],
  StateUpdateManyMutationInput: ["path", "values", "mask"],
  TransactionCreateInput: ["hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage", "executionResult", "IncomingMessageBatchTransaction"],
  TransactionUpdateInput: ["hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage", "executionResult", "IncomingMessageBatchTransaction"],
  TransactionCreateManyInput: ["hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage"],
  TransactionUpdateManyMutationInput: ["hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage"],
  TransactionExecutionResultCreateInput: ["stateTransitions", "protocolTransitions", "status", "statusMessage", "tx", "block"],
  TransactionExecutionResultUpdateInput: ["stateTransitions", "protocolTransitions", "status", "statusMessage", "tx", "block"],
  TransactionExecutionResultCreateManyInput: ["stateTransitions", "protocolTransitions", "status", "statusMessage", "txHash", "blockHash"],
  TransactionExecutionResultUpdateManyMutationInput: ["stateTransitions", "protocolTransitions", "status", "statusMessage"],
  BlockCreateInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parent", "successor", "transactions", "result", "batch"],
  BlockUpdateInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parent", "successor", "transactions", "result", "batch"],
  BlockCreateManyInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash", "batchHeight"],
  BlockUpdateManyMutationInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash"],
  BatchCreateInput: ["height", "proof", "blocks", "settlement"],
  BatchUpdateInput: ["height", "proof", "blocks", "settlement"],
  BatchCreateManyInput: ["height", "proof", "settlementTransactionHash"],
  BatchUpdateManyMutationInput: ["height", "proof"],
  BlockResultCreateInput: ["stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness", "block"],
  BlockResultUpdateInput: ["stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness", "block"],
  BlockResultCreateManyInput: ["blockHash", "stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness"],
  BlockResultUpdateManyMutationInput: ["stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness"],
  SettlementCreateInput: ["transactionHash", "promisedMessagesHash", "batches"],
  SettlementUpdateInput: ["transactionHash", "promisedMessagesHash", "batches"],
  SettlementCreateManyInput: ["transactionHash", "promisedMessagesHash"],
  SettlementUpdateManyMutationInput: ["transactionHash", "promisedMessagesHash"],
  IncomingMessageBatchTransactionCreateInput: ["transaction", "batch"],
  IncomingMessageBatchTransactionUpdateInput: ["transaction", "batch"],
  IncomingMessageBatchTransactionCreateManyInput: ["transactionHash", "batchId"],
  IncomingMessageBatchTransactionUpdateManyMutationInput: [],
  IncomingMessageBatchCreateInput: ["fromMessageHash", "toMessageHash", "messages"],
  IncomingMessageBatchUpdateInput: ["fromMessageHash", "toMessageHash", "messages"],
  IncomingMessageBatchCreateManyInput: ["id", "fromMessageHash", "toMessageHash"],
  IncomingMessageBatchUpdateManyMutationInput: ["fromMessageHash", "toMessageHash"],
  DecimalFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not"],
  DecimalNullableListFilter: ["equals", "has", "hasEvery", "hasSome", "isEmpty"],
  StringFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "mode", "not"],
  StatePathMaskCompoundUniqueInput: ["path", "mask"],
  StateCountOrderByAggregateInput: ["path", "values", "mask"],
  StateAvgOrderByAggregateInput: ["path", "values"],
  StateMaxOrderByAggregateInput: ["path", "mask"],
  StateMinOrderByAggregateInput: ["path", "mask"],
  StateSumOrderByAggregateInput: ["path", "values"],
  DecimalWithAggregatesFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not", "_count", "_avg", "_sum", "_min", "_max"],
  StringWithAggregatesFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "mode", "not", "_count", "_min", "_max"],
  StringNullableListFilter: ["equals", "has", "hasEvery", "hasSome", "isEmpty"],
  BoolFilter: ["equals", "not"],
  TransactionExecutionResultNullableRelationFilter: ["is", "isNot"],
  IncomingMessageBatchTransactionListRelationFilter: ["every", "some", "none"],
  IncomingMessageBatchTransactionOrderByRelationAggregateInput: ["_count"],
  TransactionCountOrderByAggregateInput: ["hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage"],
  TransactionMaxOrderByAggregateInput: ["hash", "methodId", "sender", "nonce", "signature_r", "signature_s", "isMessage"],
  TransactionMinOrderByAggregateInput: ["hash", "methodId", "sender", "nonce", "signature_r", "signature_s", "isMessage"],
  BoolWithAggregatesFilter: ["equals", "not", "_count", "_min", "_max"],
  JsonFilter: ["equals", "path", "string_contains", "string_starts_with", "string_ends_with", "array_contains", "array_starts_with", "array_ends_with", "lt", "lte", "gt", "gte", "not"],
  StringNullableFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "mode", "not"],
  TransactionRelationFilter: ["is", "isNot"],
  BlockRelationFilter: ["is", "isNot"],
  SortOrderInput: ["sort", "nulls"],
  TransactionExecutionResultCountOrderByAggregateInput: ["stateTransitions", "protocolTransitions", "status", "statusMessage", "txHash", "blockHash"],
  TransactionExecutionResultMaxOrderByAggregateInput: ["status", "statusMessage", "txHash", "blockHash"],
  TransactionExecutionResultMinOrderByAggregateInput: ["status", "statusMessage", "txHash", "blockHash"],
  JsonWithAggregatesFilter: ["equals", "path", "string_contains", "string_starts_with", "string_ends_with", "array_contains", "array_starts_with", "array_ends_with", "lt", "lte", "gt", "gte", "not", "_count", "_min", "_max"],
  StringNullableWithAggregatesFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "mode", "not", "_count", "_min", "_max"],
  IntFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not"],
  IntNullableFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not"],
  BlockNullableRelationFilter: ["is", "isNot"],
  TransactionExecutionResultListRelationFilter: ["every", "some", "none"],
  BlockResultNullableRelationFilter: ["is", "isNot"],
  BatchNullableRelationFilter: ["is", "isNot"],
  TransactionExecutionResultOrderByRelationAggregateInput: ["_count"],
  BlockCountOrderByAggregateInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash", "batchHeight"],
  BlockAvgOrderByAggregateInput: ["height", "batchHeight"],
  BlockMaxOrderByAggregateInput: ["hash", "transactionsHash", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash", "batchHeight"],
  BlockMinOrderByAggregateInput: ["hash", "transactionsHash", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash", "batchHeight"],
  BlockSumOrderByAggregateInput: ["height", "batchHeight"],
  IntWithAggregatesFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not", "_count", "_avg", "_sum", "_min", "_max"],
  IntNullableWithAggregatesFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not", "_count", "_avg", "_sum", "_min", "_max"],
  BlockListRelationFilter: ["every", "some", "none"],
  SettlementNullableRelationFilter: ["is", "isNot"],
  BlockOrderByRelationAggregateInput: ["_count"],
  BatchCountOrderByAggregateInput: ["height", "proof", "settlementTransactionHash"],
  BatchAvgOrderByAggregateInput: ["height"],
  BatchMaxOrderByAggregateInput: ["height", "settlementTransactionHash"],
  BatchMinOrderByAggregateInput: ["height", "settlementTransactionHash"],
  BatchSumOrderByAggregateInput: ["height"],
  BlockResultCountOrderByAggregateInput: ["blockHash", "stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness"],
  BlockResultMaxOrderByAggregateInput: ["blockHash", "stateRoot", "blockHashRoot"],
  BlockResultMinOrderByAggregateInput: ["blockHash", "stateRoot", "blockHashRoot"],
  BatchListRelationFilter: ["every", "some", "none"],
  BatchOrderByRelationAggregateInput: ["_count"],
  SettlementCountOrderByAggregateInput: ["transactionHash", "promisedMessagesHash"],
  SettlementMaxOrderByAggregateInput: ["transactionHash", "promisedMessagesHash"],
  SettlementMinOrderByAggregateInput: ["transactionHash", "promisedMessagesHash"],
  IncomingMessageBatchRelationFilter: ["is", "isNot"],
  IncomingMessageBatchTransactionTransactionHashBatchIdCompoundUniqueInput: ["transactionHash", "batchId"],
  IncomingMessageBatchTransactionCountOrderByAggregateInput: ["transactionHash", "batchId"],
  IncomingMessageBatchTransactionAvgOrderByAggregateInput: ["batchId"],
  IncomingMessageBatchTransactionMaxOrderByAggregateInput: ["transactionHash", "batchId"],
  IncomingMessageBatchTransactionMinOrderByAggregateInput: ["transactionHash", "batchId"],
  IncomingMessageBatchTransactionSumOrderByAggregateInput: ["batchId"],
  IncomingMessageBatchCountOrderByAggregateInput: ["id", "fromMessageHash", "toMessageHash"],
  IncomingMessageBatchAvgOrderByAggregateInput: ["id"],
  IncomingMessageBatchMaxOrderByAggregateInput: ["id", "fromMessageHash", "toMessageHash"],
  IncomingMessageBatchMinOrderByAggregateInput: ["id", "fromMessageHash", "toMessageHash"],
  IncomingMessageBatchSumOrderByAggregateInput: ["id"],
  StateCreatevaluesInput: ["set"],
  DecimalFieldUpdateOperationsInput: ["set", "increment", "decrement", "multiply", "divide"],
  StateUpdatevaluesInput: ["set", "push"],
  StringFieldUpdateOperationsInput: ["set"],
  TransactionCreateargsFieldsInput: ["set"],
  TransactionCreateauxiliaryDataInput: ["set"],
  TransactionExecutionResultCreateNestedOneWithoutTxInput: ["create", "connectOrCreate", "connect"],
  IncomingMessageBatchTransactionCreateNestedManyWithoutTransactionInput: ["create", "connectOrCreate", "createMany", "connect"],
  TransactionUpdateargsFieldsInput: ["set", "push"],
  TransactionUpdateauxiliaryDataInput: ["set", "push"],
  BoolFieldUpdateOperationsInput: ["set"],
  TransactionExecutionResultUpdateOneWithoutTxNestedInput: ["create", "connectOrCreate", "upsert", "disconnect", "delete", "connect", "update"],
  IncomingMessageBatchTransactionUpdateManyWithoutTransactionNestedInput: ["create", "connectOrCreate", "upsert", "createMany", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  TransactionCreateNestedOneWithoutExecutionResultInput: ["create", "connectOrCreate", "connect"],
  BlockCreateNestedOneWithoutTransactionsInput: ["create", "connectOrCreate", "connect"],
  NullableStringFieldUpdateOperationsInput: ["set"],
  TransactionUpdateOneRequiredWithoutExecutionResultNestedInput: ["create", "connectOrCreate", "upsert", "connect", "update"],
  BlockUpdateOneRequiredWithoutTransactionsNestedInput: ["create", "connectOrCreate", "upsert", "connect", "update"],
  BlockCreateNestedOneWithoutSuccessorInput: ["create", "connectOrCreate", "connect"],
  BlockCreateNestedOneWithoutParentInput: ["create", "connectOrCreate", "connect"],
  TransactionExecutionResultCreateNestedManyWithoutBlockInput: ["create", "connectOrCreate", "createMany", "connect"],
  BlockResultCreateNestedOneWithoutBlockInput: ["create", "connectOrCreate", "connect"],
  BatchCreateNestedOneWithoutBlocksInput: ["create", "connectOrCreate", "connect"],
  IntFieldUpdateOperationsInput: ["set", "increment", "decrement", "multiply", "divide"],
  BlockUpdateOneWithoutSuccessorNestedInput: ["create", "connectOrCreate", "upsert", "disconnect", "delete", "connect", "update"],
  BlockUpdateOneWithoutParentNestedInput: ["create", "connectOrCreate", "upsert", "disconnect", "delete", "connect", "update"],
  TransactionExecutionResultUpdateManyWithoutBlockNestedInput: ["create", "connectOrCreate", "upsert", "createMany", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  BlockResultUpdateOneWithoutBlockNestedInput: ["create", "connectOrCreate", "upsert", "disconnect", "delete", "connect", "update"],
  BatchUpdateOneWithoutBlocksNestedInput: ["create", "connectOrCreate", "upsert", "disconnect", "delete", "connect", "update"],
  NullableIntFieldUpdateOperationsInput: ["set", "increment", "decrement", "multiply", "divide"],
  BlockCreateNestedManyWithoutBatchInput: ["create", "connectOrCreate", "createMany", "connect"],
  SettlementCreateNestedOneWithoutBatchesInput: ["create", "connectOrCreate", "connect"],
  BlockUpdateManyWithoutBatchNestedInput: ["create", "connectOrCreate", "upsert", "createMany", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  SettlementUpdateOneWithoutBatchesNestedInput: ["create", "connectOrCreate", "upsert", "disconnect", "delete", "connect", "update"],
  BlockCreateNestedOneWithoutResultInput: ["create", "connectOrCreate", "connect"],
  BlockUpdateOneWithoutResultNestedInput: ["create", "connectOrCreate", "upsert", "disconnect", "delete", "connect", "update"],
  BatchCreateNestedManyWithoutSettlementInput: ["create", "connectOrCreate", "createMany", "connect"],
  BatchUpdateManyWithoutSettlementNestedInput: ["create", "connectOrCreate", "upsert", "createMany", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  TransactionCreateNestedOneWithoutIncomingMessageBatchTransactionInput: ["create", "connectOrCreate", "connect"],
  IncomingMessageBatchCreateNestedOneWithoutMessagesInput: ["create", "connectOrCreate", "connect"],
  TransactionUpdateOneRequiredWithoutIncomingMessageBatchTransactionNestedInput: ["create", "connectOrCreate", "upsert", "connect", "update"],
  IncomingMessageBatchUpdateOneRequiredWithoutMessagesNestedInput: ["create", "connectOrCreate", "upsert", "connect", "update"],
  IncomingMessageBatchTransactionCreateNestedManyWithoutBatchInput: ["create", "connectOrCreate", "createMany", "connect"],
  IncomingMessageBatchTransactionUpdateManyWithoutBatchNestedInput: ["create", "connectOrCreate", "upsert", "createMany", "set", "disconnect", "delete", "connect", "update", "updateMany", "deleteMany"],
  NestedDecimalFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not"],
  NestedStringFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "not"],
  NestedDecimalWithAggregatesFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not", "_count", "_avg", "_sum", "_min", "_max"],
  NestedIntFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not"],
  NestedStringWithAggregatesFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "not", "_count", "_min", "_max"],
  NestedBoolFilter: ["equals", "not"],
  NestedBoolWithAggregatesFilter: ["equals", "not", "_count", "_min", "_max"],
  NestedStringNullableFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "not"],
  NestedJsonFilter: ["equals", "path", "string_contains", "string_starts_with", "string_ends_with", "array_contains", "array_starts_with", "array_ends_with", "lt", "lte", "gt", "gte", "not"],
  NestedStringNullableWithAggregatesFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "contains", "startsWith", "endsWith", "not", "_count", "_min", "_max"],
  NestedIntNullableFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not"],
  NestedIntWithAggregatesFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not", "_count", "_avg", "_sum", "_min", "_max"],
  NestedFloatFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not"],
  NestedIntNullableWithAggregatesFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not", "_count", "_avg", "_sum", "_min", "_max"],
  NestedFloatNullableFilter: ["equals", "in", "notIn", "lt", "lte", "gt", "gte", "not"],
  TransactionExecutionResultCreateWithoutTxInput: ["stateTransitions", "protocolTransitions", "status", "statusMessage", "block"],
  TransactionExecutionResultCreateOrConnectWithoutTxInput: ["where", "create"],
  IncomingMessageBatchTransactionCreateWithoutTransactionInput: ["batch"],
  IncomingMessageBatchTransactionCreateOrConnectWithoutTransactionInput: ["where", "create"],
  IncomingMessageBatchTransactionCreateManyTransactionInputEnvelope: ["data", "skipDuplicates"],
  TransactionExecutionResultUpsertWithoutTxInput: ["update", "create", "where"],
  TransactionExecutionResultUpdateToOneWithWhereWithoutTxInput: ["where", "data"],
  TransactionExecutionResultUpdateWithoutTxInput: ["stateTransitions", "protocolTransitions", "status", "statusMessage", "block"],
  IncomingMessageBatchTransactionUpsertWithWhereUniqueWithoutTransactionInput: ["where", "update", "create"],
  IncomingMessageBatchTransactionUpdateWithWhereUniqueWithoutTransactionInput: ["where", "data"],
  IncomingMessageBatchTransactionUpdateManyWithWhereWithoutTransactionInput: ["where", "data"],
  IncomingMessageBatchTransactionScalarWhereInput: ["AND", "OR", "NOT", "transactionHash", "batchId"],
  TransactionCreateWithoutExecutionResultInput: ["hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage", "IncomingMessageBatchTransaction"],
  TransactionCreateOrConnectWithoutExecutionResultInput: ["where", "create"],
  BlockCreateWithoutTransactionsInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parent", "successor", "result", "batch"],
  BlockCreateOrConnectWithoutTransactionsInput: ["where", "create"],
  TransactionUpsertWithoutExecutionResultInput: ["update", "create", "where"],
  TransactionUpdateToOneWithWhereWithoutExecutionResultInput: ["where", "data"],
  TransactionUpdateWithoutExecutionResultInput: ["hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage", "IncomingMessageBatchTransaction"],
  BlockUpsertWithoutTransactionsInput: ["update", "create", "where"],
  BlockUpdateToOneWithWhereWithoutTransactionsInput: ["where", "data"],
  BlockUpdateWithoutTransactionsInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parent", "successor", "result", "batch"],
  BlockCreateWithoutSuccessorInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parent", "transactions", "result", "batch"],
  BlockCreateOrConnectWithoutSuccessorInput: ["where", "create"],
  BlockCreateWithoutParentInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "successor", "transactions", "result", "batch"],
  BlockCreateOrConnectWithoutParentInput: ["where", "create"],
  TransactionExecutionResultCreateWithoutBlockInput: ["stateTransitions", "protocolTransitions", "status", "statusMessage", "tx"],
  TransactionExecutionResultCreateOrConnectWithoutBlockInput: ["where", "create"],
  TransactionExecutionResultCreateManyBlockInputEnvelope: ["data", "skipDuplicates"],
  BlockResultCreateWithoutBlockInput: ["stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness"],
  BlockResultCreateOrConnectWithoutBlockInput: ["where", "create"],
  BatchCreateWithoutBlocksInput: ["height", "proof", "settlement"],
  BatchCreateOrConnectWithoutBlocksInput: ["where", "create"],
  BlockUpsertWithoutSuccessorInput: ["update", "create", "where"],
  BlockUpdateToOneWithWhereWithoutSuccessorInput: ["where", "data"],
  BlockUpdateWithoutSuccessorInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parent", "transactions", "result", "batch"],
  BlockUpsertWithoutParentInput: ["update", "create", "where"],
  BlockUpdateToOneWithWhereWithoutParentInput: ["where", "data"],
  BlockUpdateWithoutParentInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "successor", "transactions", "result", "batch"],
  TransactionExecutionResultUpsertWithWhereUniqueWithoutBlockInput: ["where", "update", "create"],
  TransactionExecutionResultUpdateWithWhereUniqueWithoutBlockInput: ["where", "data"],
  TransactionExecutionResultUpdateManyWithWhereWithoutBlockInput: ["where", "data"],
  TransactionExecutionResultScalarWhereInput: ["AND", "OR", "NOT", "stateTransitions", "protocolTransitions", "status", "statusMessage", "txHash", "blockHash"],
  BlockResultUpsertWithoutBlockInput: ["update", "create", "where"],
  BlockResultUpdateToOneWithWhereWithoutBlockInput: ["where", "data"],
  BlockResultUpdateWithoutBlockInput: ["stateRoot", "blockHashRoot", "afterNetworkState", "blockStateTransitions", "blockHashWitness"],
  BatchUpsertWithoutBlocksInput: ["update", "create", "where"],
  BatchUpdateToOneWithWhereWithoutBlocksInput: ["where", "data"],
  BatchUpdateWithoutBlocksInput: ["height", "proof", "settlement"],
  BlockCreateWithoutBatchInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parent", "successor", "transactions", "result"],
  BlockCreateOrConnectWithoutBatchInput: ["where", "create"],
  BlockCreateManyBatchInputEnvelope: ["data", "skipDuplicates"],
  SettlementCreateWithoutBatchesInput: ["transactionHash", "promisedMessagesHash"],
  SettlementCreateOrConnectWithoutBatchesInput: ["where", "create"],
  BlockUpsertWithWhereUniqueWithoutBatchInput: ["where", "update", "create"],
  BlockUpdateWithWhereUniqueWithoutBatchInput: ["where", "data"],
  BlockUpdateManyWithWhereWithoutBatchInput: ["where", "data"],
  BlockScalarWhereInput: ["AND", "OR", "NOT", "hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash", "batchHeight"],
  SettlementUpsertWithoutBatchesInput: ["update", "create", "where"],
  SettlementUpdateToOneWithWhereWithoutBatchesInput: ["where", "data"],
  SettlementUpdateWithoutBatchesInput: ["transactionHash", "promisedMessagesHash"],
  BlockCreateWithoutResultInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parent", "successor", "transactions", "batch"],
  BlockCreateOrConnectWithoutResultInput: ["where", "create"],
  BlockUpsertWithoutResultInput: ["update", "create", "where"],
  BlockUpdateToOneWithWhereWithoutResultInput: ["where", "data"],
  BlockUpdateWithoutResultInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parent", "successor", "transactions", "batch"],
  BatchCreateWithoutSettlementInput: ["height", "proof", "blocks"],
  BatchCreateOrConnectWithoutSettlementInput: ["where", "create"],
  BatchCreateManySettlementInputEnvelope: ["data", "skipDuplicates"],
  BatchUpsertWithWhereUniqueWithoutSettlementInput: ["where", "update", "create"],
  BatchUpdateWithWhereUniqueWithoutSettlementInput: ["where", "data"],
  BatchUpdateManyWithWhereWithoutSettlementInput: ["where", "data"],
  BatchScalarWhereInput: ["AND", "OR", "NOT", "height", "proof", "settlementTransactionHash"],
  TransactionCreateWithoutIncomingMessageBatchTransactionInput: ["hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage", "executionResult"],
  TransactionCreateOrConnectWithoutIncomingMessageBatchTransactionInput: ["where", "create"],
  IncomingMessageBatchCreateWithoutMessagesInput: ["fromMessageHash", "toMessageHash"],
  IncomingMessageBatchCreateOrConnectWithoutMessagesInput: ["where", "create"],
  TransactionUpsertWithoutIncomingMessageBatchTransactionInput: ["update", "create", "where"],
  TransactionUpdateToOneWithWhereWithoutIncomingMessageBatchTransactionInput: ["where", "data"],
  TransactionUpdateWithoutIncomingMessageBatchTransactionInput: ["hash", "methodId", "sender", "nonce", "argsFields", "auxiliaryData", "signature_r", "signature_s", "isMessage", "executionResult"],
  IncomingMessageBatchUpsertWithoutMessagesInput: ["update", "create", "where"],
  IncomingMessageBatchUpdateToOneWithWhereWithoutMessagesInput: ["where", "data"],
  IncomingMessageBatchUpdateWithoutMessagesInput: ["fromMessageHash", "toMessageHash"],
  IncomingMessageBatchTransactionCreateWithoutBatchInput: ["transaction"],
  IncomingMessageBatchTransactionCreateOrConnectWithoutBatchInput: ["where", "create"],
  IncomingMessageBatchTransactionCreateManyBatchInputEnvelope: ["data", "skipDuplicates"],
  IncomingMessageBatchTransactionUpsertWithWhereUniqueWithoutBatchInput: ["where", "update", "create"],
  IncomingMessageBatchTransactionUpdateWithWhereUniqueWithoutBatchInput: ["where", "data"],
  IncomingMessageBatchTransactionUpdateManyWithWhereWithoutBatchInput: ["where", "data"],
  IncomingMessageBatchTransactionCreateManyTransactionInput: ["batchId"],
  IncomingMessageBatchTransactionUpdateWithoutTransactionInput: ["batch"],
  TransactionExecutionResultCreateManyBlockInput: ["stateTransitions", "protocolTransitions", "status", "statusMessage", "txHash"],
  TransactionExecutionResultUpdateWithoutBlockInput: ["stateTransitions", "protocolTransitions", "status", "statusMessage", "tx"],
  BlockCreateManyBatchInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parentHash"],
  BlockUpdateWithoutBatchInput: ["hash", "transactionsHash", "beforeNetworkState", "duringNetworkState", "height", "fromEternalTransactionsHash", "toEternalTransactionsHash", "fromBlockHashRoot", "fromMessagesHash", "toMessagesHash", "parent", "successor", "transactions", "result"],
  BatchCreateManySettlementInput: ["height", "proof"],
  BatchUpdateWithoutSettlementInput: ["height", "proof", "blocks"],
  IncomingMessageBatchTransactionCreateManyBatchInput: ["transactionHash"],
  IncomingMessageBatchTransactionUpdateWithoutBatchInput: ["transaction"]
};

type InputTypesNames = keyof typeof inputTypes;

type InputTypeFieldNames<TInput extends InputTypesNames> = Exclude<
  keyof typeof inputTypes[TInput]["prototype"],
  number | symbol
>;

type InputTypeFieldsConfig<
  TInput extends InputTypesNames
> = FieldsConfig<InputTypeFieldNames<TInput>>;

export type InputTypeConfig<TInput extends InputTypesNames> = {
  class?: ClassDecorator[];
  fields?: InputTypeFieldsConfig<TInput>;
};

export type InputTypesEnhanceMap = {
  [TInput in InputTypesNames]?: InputTypeConfig<TInput>;
};

export function applyInputTypesEnhanceMap(
  inputTypesEnhanceMap: InputTypesEnhanceMap,
) {
  for (const inputTypeEnhanceMapKey of Object.keys(inputTypesEnhanceMap)) {
    const inputTypeName = inputTypeEnhanceMapKey as keyof typeof inputTypesEnhanceMap;
    const typeConfig = inputTypesEnhanceMap[inputTypeName]!;
    const typeClass = inputTypes[inputTypeName];
    const typeTarget = typeClass.prototype;
    applyTypeClassEnhanceConfig(
      typeConfig,
      typeClass,
      typeTarget,
      inputsInfo[inputTypeName as keyof typeof inputsInfo],
    );
  }
}

