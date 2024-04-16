// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-assignment,guard-for-in,@typescript-eslint/consistent-type-assertions */
import { inject } from "tsyringe";
import { Arg, Query as GraphqlQuery } from "type-graphql";
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLInputFieldConfig,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  GraphQLList,
  GraphQLInputType,
  GraphQLOutputType,
  ThunkObjMap,
} from "graphql/type";
import {
  MethodParameterEncoder,
  Runtime,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import {
  MandatoryProtocolModulesRecord,
  NetworkState,
  Protocol,
  ProtocolModulesRecord,
  State,
  StateMap,
} from "@proto-kit/protocol";
import { Field, FlexibleProvablePure, ProvableExtended } from "o1js";
import {
  Query,
  QueryBuilderFactory,
  QueryGetterState,
  QueryGetterStateMap,
  QueryTransportModule,
  NetworkStateQuery,
  BlockStorage,
  HistoricalBlockStorage,
  NetworkStateTransportModule,
} from "@proto-kit/sequencer";
import {
  BaseModuleType,
  log,
  ModuleContainer,
  ModulesRecord,
  NonMethods,
  range,
} from "@proto-kit/common";
import { ObjMap } from "graphql/jsutils/ObjMap";
import isArray from "lodash/isArray";

import { graphqlModule, SchemaGeneratingGraphqlModule } from "../GraphqlModule";

interface ProvableExtension<T, TJson = any> {
  toInput: (x: T) => { fields?: Field[]; packed?: [Field, number][] };
  toJSON: (x: T) => TJson;
  fromJSON: (x: TJson) => T;
}

interface AnyJson {
  [key: string]: any;
}

@graphqlModule()
export class QueryGraphqlModule<
  RuntimeModules extends RuntimeModulesRecord,
> extends SchemaGeneratingGraphqlModule {
  public constructor(
    @inject("QueryTransportModule")
    private readonly queryTransportModule: QueryTransportModule,
    @inject("NetworkStateTransportModule")
    private readonly networkStateTransportModule: NetworkStateTransportModule,
    @inject("Runtime") private readonly runtime: Runtime<RuntimeModules>,
    @inject("Protocol")
    private readonly protocol: Protocol<
      MandatoryProtocolModulesRecord & ProtocolModulesRecord
    >,
    @inject("BlockStorage")
    private readonly blockStorage: BlockStorage & HistoricalBlockStorage
  ) {
    super();
  }

  @GraphqlQuery(() => [String], { nullable: true })
  public async state(@Arg("path") path: string): Promise<string[] | undefined> {
    const value = await this.queryTransportModule.get(Field(path));
    return value?.map((field) => field.toString());
  }

  private jsonPrimitiveToGraphqlType(value: any): GraphQLScalarType {
    switch (typeof value) {
      case "symbol":
      case "string": {
        return GraphQLString;
      }
      case "boolean": {
        return GraphQLBoolean;
      }
      case "number": {
        return GraphQLInt;
      }
      default:
    }
    throw new Error(`Can't decode type ${typeof value}`);
  }

  private inputArray(value: AnyJson, name: string): GraphQLInputType {
    if (value.length === undefined || value.length <= 0) {
      throw new Error(
        "Dummy array not initialized correctly. Did you define Provable.Array() with length 0?"
      );
    }
    const valueType = value[0];
    return new GraphQLList(
      // eslint-disable-next-line no-nested-ternary
      typeof valueType === "object"
        ? isArray(valueType)
          ? this.inputArray(valueType, `${name}_object`)
          : this.inputJsonToGraphQl(valueType, `${name}_object`)
        : this.jsonPrimitiveToGraphqlType(valueType)
    );
  }

  private inputJsonToGraphQl(
    json: AnyJson,
    name: string
  ): GraphQLInputObjectType {
    const fields: { [key: string]: GraphQLInputFieldConfig } = {};

    Object.entries(json).forEach(([key, value]) => {
      fields[key] = {
        type:
          // eslint-disable-next-line no-nested-ternary
          typeof value === "object"
            ? isArray(value)
              ? this.inputArray(value, `${name}${key}`)
              : this.inputJsonToGraphQl(value, `${name}${key}`)
            : this.jsonPrimitiveToGraphqlType(value),
      };
    });

    return new GraphQLInputObjectType({
      name,
      fields,
    });
  }

  private graphqlArray(value: AnyJson, name: string): GraphQLOutputType {
    if (value.length === undefined || value.length <= 0) {
      throw new Error(
        "Dummy array not initialized correctly. Did you define Provable.Array() with length 0?"
      );
    }
    const valueType = value[0];
    return new GraphQLList(
      // eslint-disable-next-line no-nested-ternary
      typeof valueType === "object"
        ? isArray(valueType)
          ? this.graphqlArray(valueType, `${name}_object`)
          : this.jsonToGraphQl(valueType, `${name}_object`)
        : this.jsonPrimitiveToGraphqlType(valueType)
    );
  }

  private jsonToGraphQl(json: any, name: string): GraphQLObjectType {
    const fields: { [key: string]: GraphQLFieldConfig<unknown, unknown> } = {};

    Object.entries(json).forEach(([key, value]) => {
      fields[key] = {
        type:
          // eslint-disable-next-line no-nested-ternary
          typeof value === "object"
            ? isArray(value)
              ? this.graphqlArray(value, `${name}${key}`)
              : this.jsonToGraphQl(value, `${name}${key}`)
            : this.jsonPrimitiveToGraphqlType(value),
      };
    });

    return new GraphQLObjectType({
      name,
      fields,
    });
  }

  private flexiblePureToGraphql<
    ProvableType,
    ObjectType extends GraphQLInputObjectType | GraphQLObjectType,
  >(
    type: FlexibleProvablePure<ProvableType>,
    name: string,
    jsonFunction: (json: any, name: string) => ObjectType
  ): GraphQLScalarType | ObjectType {
    // This is a temporary workaround until transport-layer has been
    // switched to json
    const valueType = type as ProvableExtended<unknown>;
    const valueFieldLength = MethodParameterEncoder.fieldSize(valueType);

    const dummyValue = valueType.fromFields(
      range(0, valueFieldLength).map(() => Field(0)),
      []
    );
    const json = valueType.toJSON(dummyValue);

    if (typeof json === "object") {
      return jsonFunction(json, name);
    }
    // json is a primitive
    return this.jsonPrimitiveToGraphqlType(json);
  }

  public generateStateMapResolver<Key, Value>(
    fieldKey: string,
    query: QueryGetterStateMap<Key, Value>,
    stateMap: StateMap<Key, Value>
  ): GraphQLFieldConfig<unknown, unknown> {
    const valueType = this.flexiblePureToGraphql(
      stateMap.valueType,
      `${fieldKey}Value`,
      this.jsonToGraphQl.bind(this)
    );
    const keyType = this.flexiblePureToGraphql(
      stateMap.keyType,
      `${fieldKey}Key`,
      this.inputJsonToGraphQl.bind(this)
    );

    return {
      type: valueType,

      args: {
        key: {
          type: keyType,
        },
      },

      resolve: async (source, args: { key: any }) => {
        try {
          if (args.key === undefined) {
            throw new Error("Specifying a key is mandatory");
          }

          const provableKey = (
            stateMap.keyType as ProvableExtension<Key | NonMethods<Key>>
          ).fromJSON(args.key) as Key;

          const value: Value | undefined = await query.get(provableKey);

          return value !== undefined
            ? (stateMap.valueType as ProvableExtension<unknown>).toJSON(value)
            : undefined;
        } catch (error: unknown) {
          log.error(error);

          if (error instanceof Error) {
            throw error;
          }
          return undefined;
        }
      },
    };
  }

  public generateStateResolver<Value>(
    fieldKey: string,
    query: QueryGetterState<Value>,
    state: State<Value>
  ) {
    const valueType = this.flexiblePureToGraphql(
      state.valueType,
      `${fieldKey}Value`,
      this.jsonToGraphQl.bind(this)
    );

    return {
      type: valueType,
      args: {},

      // eslint-disable-next-line consistent-return
      resolve: async () => {
        try {
          const value: Value | undefined = await query.get();

          return value !== undefined
            ? (state.valueType as ProvableExtension<unknown>).toJSON(value)
            : undefined;
        } catch (error: unknown) {
          log.error(error);

          if (error instanceof Error) {
            throw error;
          }
        }
      },
    };
  }

  public generateSchemaForQuery<
    ModuleType extends BaseModuleType,
    ContainerModulesRecord extends ModulesRecord,
  >(
    container: ModuleContainer<ContainerModulesRecord>,
    containerQuery: Query<ModuleType, any>,
    namePrefix: string
  ): ObjMap<GraphQLFieldConfig<unknown, unknown>> {
    const types: ObjMap<GraphQLFieldConfig<unknown, unknown>> = {};

    for (const key in container.definition.modules) {
      const query = containerQuery[key];

      const moduleTypes: ObjMap<GraphQLFieldConfig<unknown, unknown>> = {};

      for (const fieldKey in query) {
        const stateProperty = (container.resolve(key) as any)[fieldKey];

        if (stateProperty instanceof StateMap) {
          // StateMap
          moduleTypes[fieldKey] = this.generateStateMapResolver(
            `${namePrefix}${key}${fieldKey}`,
            query[fieldKey],
            stateProperty
          );
        } else if (stateProperty instanceof State) {
          // State
          moduleTypes[fieldKey] = this.generateStateResolver(
            `${namePrefix}${key}${fieldKey}`,
            query[fieldKey],
            stateProperty
          );
        }
      }

      // Only add object if module has one or more State properties
      if (Object.values(moduleTypes).length > 0) {
        types[key] = {
          type: new GraphQLObjectType({
            name: key,
            fields: moduleTypes,
          }),

          resolve: () => true,
        };
      }
    }

    return types;
  }

  public generateSchema(): GraphQLSchema {
    const runtimeQuery = QueryBuilderFactory.fromRuntime(
      this.runtime,
      this.queryTransportModule
    );

    const runtimeFields = this.generateSchemaForQuery(
      this.runtime,
      runtimeQuery,
      "Runtime"
    );
    const enableRuntime = Object.keys(runtimeFields).length > 0;

    const protocolQuery = QueryBuilderFactory.fromProtocol(
      this.protocol,
      this.queryTransportModule
    );
    const protocolFields = this.generateSchemaForQuery(
      this.protocol,
      protocolQuery,
      "Protocol"
    );
    const enableProtocol = Object.keys(protocolFields).length > 0;

    const networkQuery = new NetworkStateQuery(
      this.networkStateTransportModule
    );
    const networkType = this.flexiblePureToGraphql(
      NetworkState,
      "Network",
      this.jsonToGraphQl.bind(this)
    );

    let fieldsDefinition: ThunkObjMap<GraphQLFieldConfig<any, any>> = {};
    if (enableRuntime) {
      fieldsDefinition = {
        ...fieldsDefinition,
        runtime: {
          type: new GraphQLObjectType({
            name: "Runtime",
            fields: runtimeFields,
          }),

          resolve: () => true,
        },
      };
    }
    if (enableProtocol) {
      fieldsDefinition = {
        ...fieldsDefinition,
        protocol: {
          type: new GraphQLObjectType({
            name: "Protocol",
            fields: protocolFields,
          }),

          resolve: () => true,
        },
      };
    }

    const query = new GraphQLObjectType({
      name: "Query",

      fields: {
        ...fieldsDefinition,

        network: {
          type: new GraphQLObjectType({
            name: "network",
            fields: {
              unproven: {
                type: networkType,
                resolve: () => networkQuery.unproven,
              },
              staged: {
                type: networkType,
                resolve: () => networkQuery.stagedUnproven,
              },
              proven: {
                type: networkType,
                resolve: () => networkQuery.proven,
              },
            },
          }),
          resolve: () => true,
        },
      },
    });

    return new GraphQLSchema({ query });
  }
}
// eslint-disable-next-line max-len
/* eslint-enable @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-assignment,guard-for-in,@typescript-eslint/consistent-type-assertions */
