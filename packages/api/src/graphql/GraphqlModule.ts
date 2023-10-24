import type { UnTypedClass } from "@proto-kit/protocol";
import { ConfigurableModule } from "@proto-kit/common";
import { GraphQLSchema } from "graphql/type";

export abstract class GraphqlModule<Config> extends ConfigurableModule<Config> {
  public abstract resolverType: UnTypedClass;
}

export abstract class SchemaGeneratingGraphqlModule<
  Config
> extends GraphqlModule<Config> {
  public abstract generateSchema(): GraphQLSchema;
}
