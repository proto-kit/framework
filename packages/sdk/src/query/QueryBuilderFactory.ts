/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable guard-for-in */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable putout/putout */
import { TypedClass } from "@proto-kit/common";
import {
  Runtime,
  RuntimeModule,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import {
  Protocol,
  ProtocolModule,
  ProtocolModulesRecord,
  State,
  StateMap,
} from "@proto-kit/protocol";

import type { QueryTransportModule } from "./StateServiceQueryModule";

export type PickByType<Type, Value> = {
  [Key in keyof Type as Type[Key] extends Value | undefined
    ? Key
    : never]: Type[Key];
};

export interface QueryGetterState<Value> {
  get: () => Promise<Value | undefined>;
}

export interface QueryGetterStateMap<Key, Value> {
  get: (key: Key) => Promise<Value | undefined>;
}

export type PickStateProperties<Type> = PickByType<Type, State<any>>;

export type PickStateMapProperties<Type> = PickByType<Type, StateMap<any, any>>;

export type MapStateToQuery<StateProperty> = StateProperty extends State<
  infer Value
>
  ? QueryGetterState<Value>
  : never;

export type MapStateMapToQuery<StateProperty> = StateProperty extends StateMap<
  infer Key,
  infer Value
>
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
  RuntimeModules extends Record<string, TypedClass<ModuleType>>
> = {
  [Key in keyof RuntimeModules]: ModuleQuery<InstanceType<RuntimeModules[Key]>>;
};

export const QueryBuilderFactory = {
  // eslint-disable-next-line sonarjs/cognitive-complexity
  fillQuery<Module>(
    runtimeModule: Module,
    queryTransportModule: QueryTransportModule
  ): ModuleQuery<Module> {
    let query = {} as ModuleQuery<Module>;

    for (const propertyName in runtimeModule) {
      const property = runtimeModule[propertyName];
      if (property instanceof StateMap) {
        query = {
          ...query,

          [propertyName]: {
            get: async (key: any) => {
              const path = property.getPath(key);
              const fields = await queryTransportModule.get(path);
              return fields ? property.valueType.fromFields(fields) : undefined;
            },
          },
        };
      }

      if (property instanceof State) {
        query = {
          ...query,

          [propertyName]: {
            get: async () => {
              // eslint-disable-next-line max-len
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              const path = property.path!;
              const fields = await queryTransportModule.get(path);

              return fields ? property.valueType.fromFields(fields) : undefined;
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
    >((query, runtimeModuleName: keyof RuntimeModules) => {
      runtime.isValidModuleName(modules, runtimeModuleName);

      const runtimeModule = runtime.resolve(runtimeModuleName);

      query[runtimeModuleName] = QueryBuilderFactory.fillQuery(
        runtimeModule,
        queryTransportModule
      );

      return query;
      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter,@typescript-eslint/consistent-type-assertions
    }, {} as any);
  },

  fromProtocol<ProtocolModules extends ProtocolModulesRecord>(
    runtime: Protocol<ProtocolModules>,
    queryTransportModule: QueryTransportModule
  ): Query<ProtocolModule<unknown>, ProtocolModules> {
    const { modules } = runtime.definition;

    return Object.keys(modules).reduce<Query<ProtocolModule<unknown>, ProtocolModules>>(
      (query, protocolModuleName: keyof ProtocolModules) => {
        runtime.isValidModuleName(modules, protocolModuleName);

        const protocolModule = runtime.resolve(protocolModuleName);

        query[protocolModuleName] = QueryBuilderFactory.fillQuery(
          protocolModule,
          queryTransportModule
        );

        return query;
      },
      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/prefer-reduce-type-parameter,@typescript-eslint/consistent-type-assertions
      {} as any
    );
  },
};
