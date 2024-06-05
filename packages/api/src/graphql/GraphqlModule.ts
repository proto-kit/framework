import { ConfigurableModule, NoConfig, TypedClass } from "@proto-kit/common";
import { GraphQLSchema } from "graphql/type";
import { injectable, Lifecycle, scoped } from "tsyringe";
import { Resolver } from "type-graphql";

const graphqlModuleMetadataKey = "graphqlModule";

export abstract class GraphqlModule<
  Config = NoConfig,
> extends ConfigurableModule<Config> {
  public constructor() {
    super();

    const isDecoratedProperly =
      Reflect.getMetadata(graphqlModuleMetadataKey, this.constructor) === true;
    if (!isDecoratedProperly) {
      throw new Error(
        `Module ${this.constructor.name} not decorated property. Make sure to use @graphqlModule() on all GraphqlModules`
      );
    }
  }
}

export abstract class SchemaGeneratingGraphqlModule<
  Config = NoConfig,
> extends GraphqlModule<Config> {
  public abstract generateSchema(): GraphQLSchema;
}

export function graphqlModule() {
  return (
    /**
     * Check if the target class extends GraphqlModule, while
     * also providing static config presets
     */
    target: TypedClass<GraphqlModule<unknown>>
  ) => {
    injectable()(target);
    scoped(Lifecycle.ContainerScoped)(target);
    Resolver()(target);

    Reflect.defineMetadata(graphqlModuleMetadataKey, true, target);
  };
}
