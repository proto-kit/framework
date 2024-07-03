import { ObjectType, Field } from "type-graphql";
import { UntypedOption, UntypedStateTransition } from "@proto-kit/sequencer";
import { IsBoolean } from "class-validator";
import { ComputedBlockTransactionWithBlockHash } from "@proto-kit/indexer";

import { TransactionModel } from "./TransactionModel";

@ObjectType()
export class OptionModel {
  public static fromServiceLayerModel(st: UntypedOption) {
    return new OptionModel(st.isSome.toBoolean(), st.treeValue.toString());
  }

  @Field(() => Boolean)
  public isSome: boolean;

  @Field(() => String)
  public value: string;

  public constructor(isSome: boolean, value: string) {
    this.isSome = isSome;
    this.value = value;
  }
}

@ObjectType()
export class StateTransitionModel {
  public static fromServiceLayerModel(st: UntypedStateTransition) {
    return new StateTransitionModel(
      st.path.toString(),
      OptionModel.fromServiceLayerModel(st.fromValue),
      OptionModel.fromServiceLayerModel(st.toValue)
    );
  }

  @Field(() => String)
  public path: string;

  @Field(() => OptionModel)
  public from: OptionModel;

  @Field(() => OptionModel)
  public to: OptionModel;

  public constructor(path: string, from: OptionModel, to: OptionModel) {
    this.path = path;
    this.from = from;
    this.to = to;
  }
}

@ObjectType()
export class ComputedBlockTransactionModel {
  public static fromServiceLayerModel(
    cbt: ComputedBlockTransactionWithBlockHash
  ) {
    const {
      tx,
      status,
      statusMessage,
      stateTransitions,
      protocolTransitions,
      blockHash,
    } = cbt;
    return new ComputedBlockTransactionModel(
      TransactionModel.fromServiceLayerModel(tx),
      status,
      statusMessage,
      stateTransitions.map((st) =>
        StateTransitionModel.fromServiceLayerModel(st)
      ),
      protocolTransitions.map((st) =>
        StateTransitionModel.fromServiceLayerModel(st)
      ),
      blockHash
    );
  }

  @Field(() => TransactionModel)
  public tx: TransactionModel;

  @Field()
  @IsBoolean()
  public status: boolean;

  @Field(() => String, { nullable: true })
  public statusMessage: string | undefined;

  @Field(() => [StateTransitionModel], { nullable: true })
  public stateTransitions: StateTransitionModel[] | undefined;

  @Field(() => [StateTransitionModel], { nullable: true })
  public protocolTransitions: StateTransitionModel[] | undefined;

  @Field(() => String)
  public blockHash: string;

  public constructor(
    tx: TransactionModel,
    status: boolean,
    statusMessage: string | undefined,
    stateTransitions: StateTransitionModel[],
    protocolTransitions: StateTransitionModel[],
    blockHash: string
  ) {
    this.tx = tx;
    this.status = status;
    this.statusMessage = statusMessage;
    this.stateTransitions = stateTransitions;
    this.protocolTransitions = protocolTransitions;
    this.blockHash = blockHash;
  }
}
