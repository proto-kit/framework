import { Field, ObjectType, Query } from "type-graphql";

import { graphqlModule, GraphqlModule } from "../GraphqlModule";
import {
  NodeInformation,
  NodeStatusService,
  ProcessInformation,
} from "../services/NodeStatusService";

import { NodeInformationObject } from "./NodeStatusResolver";

@ObjectType()
export class ProcessInformationObject {
  public static fromServiceLayerModel(process: ProcessInformation) {
    return new ProcessInformationObject(process);
  }

  @Field()
  uptime: number;

  @Field()
  uptimeHumanReadable: string;

  @Field()
  headUsed: number;

  @Field()
  headTotal: number;

  @Field()
  nodeVersion: string;

  @Field()
  arch: string;

  @Field()
  platform: string;

  public constructor(process: ProcessInformation) {
    ({
      uptime: this.uptime,
      uptimeHumanReadable: this.uptimeHumanReadable,
      headTotal: this.headTotal,
      headUsed: this.headUsed,
      platform: this.platform,
      arch: this.arch,
      nodeVersion: this.nodeVersion,
    } = process);
  }
}

@ObjectType()
export class NodeStatusObject {
  public static fromServiceLayerModel(
    node: NodeInformation,
    process: ProcessInformation
  ) {
    return new NodeStatusObject(node, process);
  }

  @Field()
  public process: ProcessInformationObject;

  @Field()
  public node: NodeInformationObject;

  public constructor(node: NodeInformation, process: ProcessInformation) {
    this.process = ProcessInformationObject.fromServiceLayerModel(process);
    this.node = NodeInformationObject.fromServiceLayerModel(node);
  }
}

@graphqlModule()
export class AdvancedNodeStatusResolver extends GraphqlModule {
  public constructor(private readonly nodeStatusService: NodeStatusService) {
    super();
  }

  @Query(() => NodeStatusObject, {
    description:
      "Retrieves general and advanced information about the appchain and node process",
  })
  public async node(): Promise<NodeStatusObject> {
    const node = await this.nodeStatusService.getNodeInformation();
    const process = this.nodeStatusService.getProcessInfo();
    return NodeStatusObject.fromServiceLayerModel(node, process);
  }
}
