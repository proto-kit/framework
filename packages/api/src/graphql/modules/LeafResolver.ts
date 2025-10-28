import { Field, ObjectType } from "type-graphql";
import { LinkedLeafStruct } from "@proto-kit/common";

@ObjectType()
export class LeafDTO {
  public static fromServiceLayerModel(leaf: LinkedLeafStruct) {
    return new LeafDTO(
      leaf.value.toString(),
      leaf.path.toString(),
      leaf.nextPath.toString()
    );
  }

  @Field()
  value: string;

  @Field()
  path: string;

  @Field()
  nextPath: string;

  private constructor(value: string, path: string, nextPath: string) {
    this.value = value;
    this.path = path;
    this.nextPath = nextPath;
  }
}
