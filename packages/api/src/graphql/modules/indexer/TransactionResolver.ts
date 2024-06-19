import { Arg, Field, ObjectType, Query } from "type-graphql";
import { TransactionStorage } from "@proto-kit/indexer";
import { inject } from "tsyringe";

import { GraphqlModule, graphqlModule } from "../../GraphqlModule";
import { ComputedBlockTransactionModel } from "../model/ComputedBlockTransactionModel";

@ObjectType()
export class PaginatedTransactionModel {
  @Field(() => [ComputedBlockTransactionModel])
  public items: ComputedBlockTransactionModel[];

  @Field()
  public totalCount: number;

  public constructor(
    items: ComputedBlockTransactionModel[],
    totalCount: number
  ) {
    this.items = items;
    this.totalCount = totalCount;
  }
}

@graphqlModule()
export class TransactionResolver extends GraphqlModule<object> {
  public constructor(
    @inject("TransactionStorage")
    private readonly transactionStorage: TransactionStorage
  ) {
    super();
  }

  @Query(() => PaginatedTransactionModel, {
    nullable: true,
  })
  public async transactions(
    @Arg("take", {
      defaultValue: 10,
    })
    take: number,
    @Arg("skip", {
      nullable: true,
    })
    skip?: number,
    @Arg("hash", {
      nullable: true,
    })
    hash?: string,
    @Arg("methodId", {
      nullable: true,
    })
    methodId?: string,
    @Arg("sender", {
      nullable: true,
    })
    sender?: string,
    @Arg("status", {
      nullable: true,
    })
    status?: boolean
  ) {
    const transactions = await this.transactionStorage.getTransactions(
      {
        take,
        skip,
      },
      {
        hash,
        methodId,
        sender,
        status,
      }
    );

    if (!transactions.totalCount) return new PaginatedTransactionModel([], 0);

    const mappedTransactions = transactions.items
      .filter((transaction) => transaction)
      .map((transaction) =>
        ComputedBlockTransactionModel.fromServiceLayerModel(transaction!)
      );

    return new PaginatedTransactionModel(
      mappedTransactions,
      transactions.totalCount
    );
  }
}
