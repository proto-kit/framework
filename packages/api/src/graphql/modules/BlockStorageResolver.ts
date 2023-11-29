/* eslint-disable new-cap */
import { inject, injectable } from "tsyringe";
import { Arg, Field, ObjectType, Query, Resolver } from "type-graphql";
import { IsBoolean } from "class-validator";
import {
  BlockStorage,
  HistoricalBlockStorage,
  ComputedBlock,
  ComputedBlockTransaction,
} from "@proto-kit/sequencer";

import { graphqlModule, GraphqlModule } from "../GraphqlModule";

import { TransactionObject } from "./MempoolResolver";

@ObjectType()
export class ComputedBlockTransactionModel {
  public static fromServiceLayerModel(cbt: ComputedBlockTransaction) {
    const { tx, status, statusMessage } = cbt;
    return new ComputedBlockTransactionModel(
      TransactionObject.fromServiceLayerModel(tx),
      status,
      statusMessage
    );
  }

  @Field(() => TransactionObject)
  public tx: TransactionObject;

  @Field()
  @IsBoolean()
  public status: boolean;

  @Field(() => String, { nullable: true })
  public statusMessage: string | undefined;

  public constructor(
    tx: TransactionObject,
    status: boolean,
    statusMessage: string | undefined
  ) {
    this.tx = tx;
    this.status = status;
    this.statusMessage = statusMessage;
  }
}

@ObjectType()
export class ComputedBlockModel {
  public static fromServiceLayerModel({
    bundles,
    proof,
  }: ComputedBlock): ComputedBlockModel {
    return new ComputedBlockModel(
      bundles.map((bundle) =>
        bundle.map((tx) =>
          ComputedBlockTransactionModel.fromServiceLayerModel(tx)
        )
      ),
      proof.proof === "mock-proof"
        ? "mock-proof"
        : JSON.stringify(proof.toJSON())
    );
  }

  @Field(() => [[ComputedBlockTransactionModel]])
  public bundles: ComputedBlockTransactionModel[][];

  @Field()
  public proof: string;

  public constructor(
    bundles: ComputedBlockTransactionModel[][],
    proof: string
  ) {
    this.bundles = bundles;
    this.proof = proof;
  }
}

@graphqlModule()
export class BlockStorageResolver extends GraphqlModule<object> {
  public constructor(
    @inject("BlockStorage")
    private readonly blockStorage: BlockStorage & HistoricalBlockStorage
  ) {
    super();
  }

  @Query(() => ComputedBlockModel, { nullable: true })
  public async settlements(
    @Arg("height", () => Number, { nullable: true })
    height: number | undefined
  ) {
    const blockHeight =
      height ?? (await this.blockStorage.getCurrentBlockHeight()) - 1;

    const block = await this.blockStorage.getBlockAt(blockHeight);

    if (block !== undefined) {
      return ComputedBlockModel.fromServiceLayerModel(block);
    }
    return undefined;
  }
}
