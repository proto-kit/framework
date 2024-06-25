import { Field, ObjectType, Query } from "type-graphql";

import { graphqlModule, GraphqlModule } from "../GraphqlModule";
import {
  NodeInformation,
  NodeStatusService,
} from "../services/NodeStatusService";

@ObjectType()
export class NodeInformationObject {
  public static fromServiceLayerModel(status: NodeInformation) {
    return new NodeInformationObject(status.blockHeight, status.batchHeight);
  }

  @Field()
  public blockHeight: number;

  @Field()
  public batchHeight: number;

  public constructor(blockHeight: number, batchHeight: number) {
    this.blockHeight = blockHeight;
    this.batchHeight = batchHeight;
  }
}

@graphqlModule()
export class NodeStatusResolver extends GraphqlModule {
  public constructor(private readonly nodeStatusService: NodeStatusService) {
    super();
  }

  @Query(() => NodeInformationObject, {
    description: "Retrieves general information about the appchain",
  })
  public async node(): Promise<NodeInformationObject> {
    const status = await this.nodeStatusService.getNodeInformation();
    return NodeInformationObject.fromServiceLayerModel(status);
  }
}
