import { Field, ObjectType, Query } from "type-graphql";
import { ChildContainerProvider } from "@proto-kit/common";

import { graphqlModule, GraphqlModule } from "../GraphqlModule";
import { NodeStatus, NodeStatusService } from "../services/NodeStatusService";

@ObjectType()
export class NodeStatusObject {
  public static fromServiceLayerModel(status: NodeStatus) {
    return new NodeStatusObject(
      status.uptime,
      status.uptimeHumanReadable,
      status.height,
      status.settlements
    );
  }

  @Field()
  public uptime: number;

  @Field()
  public height: number;

  @Field()
  public settlements: number;

  @Field()
  public uptimeHumanReadable: string;

  public constructor(
    uptime: number,
    uptimeHumanReadable: string,
    height: number,
    settlements: number
  ) {
    this.uptime = uptime;
    this.uptimeHumanReadable = uptimeHumanReadable;
    this.height = height;
    this.settlements = settlements;
  }
}

@graphqlModule()
export class NodeStatusResolver extends GraphqlModule {
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
