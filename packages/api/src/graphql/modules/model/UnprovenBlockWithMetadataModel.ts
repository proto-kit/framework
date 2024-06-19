import { Field, ObjectType } from "type-graphql";
import {
  UnprovenBlockMetadata,
  UnprovenBlockWithMetadata,
} from "@proto-kit/sequencer";

import { UnprovenBlockModel } from "./UnprovenBlockModel";

@ObjectType()
export class UnprovenBlockMetadataModel {
  public static fromServiceLayerModel(metadata: UnprovenBlockMetadata) {
    return new UnprovenBlockMetadataModel(metadata.stateRoot.toString());
  }

  @Field(() => String, { nullable: true })
  public stateRoot: string;

  public constructor(stateRoot: string) {
    this.stateRoot = stateRoot;
  }
}

@ObjectType()
export class UnprovenBlockWithMetadataModel {
  public static fromServiceLayerModel({
    block: unprovenBlock,
    metadata,
  }: UnprovenBlockWithMetadata) {
    return new UnprovenBlockWithMetadataModel(
      UnprovenBlockModel.fromServiceLayerModel(unprovenBlock),
      UnprovenBlockMetadataModel.fromServiceLayerModel(metadata)
    );
  }

  @Field(() => UnprovenBlockModel, { nullable: true })
  public block: UnprovenBlockModel;

  @Field(() => UnprovenBlockMetadataModel)
  public metadata: UnprovenBlockMetadataModel;

  private constructor(
    block: UnprovenBlockModel,
    metadata: UnprovenBlockMetadataModel
  ) {
    this.block = block;
    this.metadata = metadata;
  }
}
