import { Field, ObjectType, Query } from "type-graphql";
import { ChildContainerProvider, NoConfig } from "@proto-kit/common";

import { graphqlModule, GraphqlModule } from "../GraphqlModule";
import { NodeStatus, NodeStatusService } from "../services/NodeStatusService";

@ObjectType()
export class NodeStatusObject {
  public static fromServiceLayerModel(status: NodeStatus) {
    return new NodeStatusObject(
      status.uptime,
      status.uptimeHumanReadable,
      status.height
    );
  }

  @Field()
  public uptime: number;

  @Field()
  public height: number;

  @Field()
  public uptimeHumanReadable: string;

  public constructor(
    uptime: number,
    uptimeHumanReadable: string,
    height: number
  ) {
    this.uptime = uptime;
    this.uptimeHumanReadable = uptimeHumanReadable;
    this.height = height;
  }
}

@graphqlModule()
export class NodeStatusResolver extends GraphqlModule<NoConfig> {
  public constructor(private readonly nodeStatusService: NodeStatusService) {
    super();
  }

  public create(childContainerProvider: ChildContainerProvider) {
    super.create(childContainerProvider);

    // Workaround to initialize uptime
    void this.nodeStatusService.getNodeStatus();
  }

  @Query(() => NodeStatusObject)
  public async nodeStatus(): Promise<NodeStatusObject> {
    const status = await this.nodeStatusService.getNodeStatus();
    return NodeStatusObject.fromServiceLayerModel(status);
  }
}
