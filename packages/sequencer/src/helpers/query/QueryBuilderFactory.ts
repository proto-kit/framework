import { TypedClass, RollupMerkleTreeWitness } from "@proto-kit/common";
import {
  Runtime,
  RuntimeModule,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModule,
  ProtocolModulesRecord,
  State,
  StateMap,
} from "@proto-kit/protocol";

import { QueryTransportModule } from "./QueryTransportModule";

export type PickByType<Type, Value> = {
  [Key in keyof Type as Type[Key] extends Value | undefined
    ? Key
    : never]: Type[Key];
};

export interface QueryGetterState<Value> {
  get: () => Promise<Value | undefined>;
  path: () => string;
  merkleWitness: () => Promise<RollupMerkleTreeWitness | undefined>;
}

export interface QueryGetterStateMap<Key, Value> {
  get: (key: Key) => Promise<Value | undefined>;
  path: (key: Key) => string;
  merkleWitness: (key: Key) => Promise<RollupMerkleTreeWitness | undefined>;
}

export type PickStateProperties<Type> = PickByType<Type, State<any>>;

export type PickStateMapProperties<Type> = PickByType<Type, StateMap<any, any>>;

export type MapStateToQuery<StateProperty> =
  StateProperty extends State<infer Value> ? QueryGetterState<Value> : never;

export type MapStateMapToQuery<StateProperty> =
  StateProperty extends StateMap<infer Key, infer Value>
    ? QueryGetterStateMap<Key, Value>
    : never;

export type ModuleQuery<Module> = {
  [Key in keyof PickStateMapProperties<Module>]: MapStateMapToQuery<
    PickStateMapProperties<Module>[Key]
  >;
} & {
  [Key in keyof PickStateProperties<Module>]: MapStateToQuery<
    PickStateProperties<Module>[Key]
  >;
};

export type Query<
  ModuleType,
  ModuleRecord extends Record<string, TypedClass<ModuleType>>,
> = {
  [Key in keyof ModuleRecord]: ModuleQuery<InstanceType<ModuleRecord[Key]>>;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isStringKeyOf(key: string | number | symbol): key is string {
  return typeof key === "string";
}

/* eslint-disable guard-for-in,@typescript-eslint/consistent-type-assertions */
export const QueryBuilderFactory = {
  fillQuery<Module extends Object>(
    runtimeModule: Module,
    queryTransportModule: QueryTransportModule
  ): ModuleQuery<Module> {
    let query = {} as ModuleQuery<Module>;

    for (const propertyName in runtimeModule) {
      // we're accessing the propertyName twice here and in the functions below
      // because the path reference/value was wrong in the query API otherwise
      const propertyCheck = runtimeModule[propertyName];
      if (propertyCheck instanceof StateMap) {
        query = {
          ...query,

          [propertyName]: {
            get: async (key: any) => {
              const property = runtimeModule[propertyName] as StateMap<
                unknown,
                unknown
              >;
              const path = property.getPath(key);
              const fields = await queryTransportModule.get(path);
              return fields ? property.valueType.fromFields(fields) : undefined;
            },

            path: (key: any) => {
              const property = runtimeModule[propertyName] as StateMap<
                unknown,
                unknown
              >;
              return property.getPath(key);
            },

            merkleWitness: async (key: any) => {
              const property = runtimeModule[propertyName] as StateMap<
                unknown,
                unknown
              >;
              const path = property.getPath(key);
              return await queryTransportModule.merkleWitness(path);
            },
          },
        };
      }

      if (propertyCheck instanceof State) {
        query = {
          ...query,

          [propertyName]: {
            get: async () => {
              const property = runtimeModule[propertyName] as State<unknown>;

              const path = property.path!;
              const fields = await queryTransportModule.get(path);

              return fields ? property.valueType.fromFields(fields) : undefined;
            },

            path: () => {
              const property = runtimeModule[propertyName] as State<unknown>;
              return property.path;
            },

            merkleWitness: async () => {
              const property = runtimeModule[propertyName] as State<unknown>;

              const path = property.path!;
              return await queryTransportModule.merkleWitness(path);
            },
          },
        };
      }
    }
    return query;
  },

  fromRuntime<RuntimeModules extends RuntimeModulesRecord>(
    runtime: Runtime<RuntimeModules>,
    queryTransportModule: QueryTransportModule
  ): Query<RuntimeModule<unknown>, RuntimeModules> {
    const { modules } = runtime.definition;

    return Object.keys(modules).reduce<
      Query<RuntimeModule<unknown>, RuntimeModules>
    >((query, runtimeModuleName: string) => {
      runtime.assertIsValidModuleName(runtimeModuleName);

      const runtimeModule = runtime.resolve(runtimeModuleName);

      query[runtimeModuleName] = QueryBuilderFactory.fillQuery(
        runtimeModule,
        queryTransportModule
      );

      return query;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    }, {} as any);
  },

  fromProtocol<
    ProtocolModules extends MandatoryProtocolModulesRecord &
      ProtocolModulesRecord,
  >(
    protocol: Protocol<ProtocolModules>,
    queryTransportModule: QueryTransportModule
  ): Query<ProtocolModule<unknown>, ProtocolModules> {
    const { modules } = protocol.definition;

    return Object.keys(modules).reduce<
      Query<ProtocolModule<unknown>, ProtocolModules>
    >(
      (query, protocolModuleName: string) => {
        protocol.assertIsValidModuleName(protocolModuleName);

        const protocolModule = protocol.resolve(protocolModuleName);

        query[protocolModuleName] = QueryBuilderFactory.fillQuery(
          protocolModule,
          queryTransportModule
        );

        return query;
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      {} as any
    );
  },
};
/* eslint-enable guard-for-in,@typescript-eslint/consistent-type-assertions */
