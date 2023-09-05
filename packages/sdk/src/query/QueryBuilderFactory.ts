/* eslint-disable @typescript-eslint/no-unsafe-return */

/* eslint-disable guard-for-in */

/* eslint-disable putout/putout */
import { TypedClass } from "@proto-kit/common";
import {
  Runtime,
  RuntimeModule,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import { State, StateMap } from "@proto-kit/protocol";

import { QueryTransportModule } from "./InMemoryQueryTransportModule";

export type PickByType<T, Value> = {
  [P in keyof T as T[P] extends Value | undefined ? P : never]-?: T[P];
};

export interface QueryGetterState<Value> {
  get: () => Promise<Value | undefined>;
}

export interface QueryGetterStateMap<Key, Value> {
  get: (key: Key) => Promise<Value | undefined>;
}

export type PickStateProperties<Type> = PickByType<Type, State<any>>;

export type PickStateMapProperties<Type> = PickByType<
  Type,
  StateMap<any, any>
>;

export type MapStateToQuery<StateProperty> = StateProperty extends State<
  infer Value
> ? QueryGetterState<Value> : never;

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
  fromRuntime<RuntimeModules extends RuntimeModulesRecord>(
    runtime: Runtime<RuntimeModules>,
    queryTransportModule: QueryTransportModule
  ) {
    const { modules } = runtime.definition;

    return Object.keys(modules).reduce<
      Query<RuntimeModule<unknown>, typeof runtime.definition.modules>
    >((query, runtimeModuleName: keyof RuntimeModules) => {
      runtime.isValidModuleName(modules, runtimeModuleName);

      const runtimeModule = runtime.resolve(runtimeModuleName);

      for (const propertyName in runtimeModule) {
        const property = runtimeModule[propertyName];
        if (property instanceof StateMap) {
          query[runtimeModuleName] = {
            ...query[runtimeModuleName],

            [propertyName]: {
              get: async (key: any) => {
                const path = property.getPath(key);
                const fields = await queryTransportModule.get(path);
                return fields
                  ? property.valueType.fromFields(fields)
                  : undefined;
              },
            },
          };
        }

        if (property instanceof State) {
          query[runtimeModuleName] = {
            ...query[runtimeModuleName],

            [propertyName]: {
              get: async () => {
                const path = property.path!;
                const fields = await queryTransportModule.get(path);

                return fields
                  ? property.valueType.fromFields(fields)
                  : undefined;
              },
            },
          };
        }
      }

      return query;
    }, {} as any);
  },
};
