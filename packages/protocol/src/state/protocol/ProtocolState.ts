import { createReference, Reference } from "@proto-kit/common";

import { WithPath, WithStateServiceProvider } from "../State";
import { Path } from "../../model/Path";
import { StateServiceProvider } from "../StateServiceProvider";
import { PROTOKIT_PREFIXES } from "../../hashing/protokit-prefixes";
import { TransitioningProtocolModule } from "../../protocol/TransitioningProtocolModule";

const errors = {
  missingName: (className: string) =>
    new Error(
      `Unable to provide a unique identifier for state, ${className} is missing a name. 
      Did you forget to extend your block module with 'extends ...Hook'?`
    ),

  missingParent: (className: string, type: string, moduleType: string) =>
    new Error(
      `Unable to provide parent '${type}' for state, ${className} is missing a name. 
      Did you forget to extend your module with 'extends ${moduleType}'?`
    ),
};

export interface StatefulModule {
  name?: string;
  parent?: {
    stateServiceProvider: StateServiceProvider;
  };
}

/**
 * Decorates a runtime module property as state, passing down some
 * underlying values to improve developer experience.
 */
export function state() {
  return <TargetTransitioningModule extends StatefulModule>(
    target: TargetTransitioningModule,
    propertyKey: string
  ) => {
    Object.defineProperty(target, propertyKey, {
      enumerable: true,

      get: function get(this: TargetTransitioningModule) {
        // The reason for why we store the state value in this weird way is that
        // in the decorator on the prototype of the class. This means that if there
        // are multiple instances of this class, any closure that this getter shares
        // will be the same for all instances.
        // Therefore, we need to somehow save the set instance on the instance itself

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const reference:
          | Reference<WithPath & WithStateServiceProvider>
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          | undefined = (this as any)[`protokit_state_cache_${propertyKey}`];

        // Short-circuit this to return the state in case its already initialized
        if (reference !== undefined && reference.value.path !== undefined) {
          return reference.value;
        }

        if (this.name === undefined) {
          throw errors.missingName(this.constructor.name);
        }

        const isProtocol = target instanceof TransitioningProtocolModule;

        if (!this.parent) {
          const debugInfo = isProtocol
            ? { parentName: "protocol", baseModuleNames: "...Hook" }
            : { parentName: "runtime", baseModuleNames: "RuntimeModule" };

          throw errors.missingParent(
            this.constructor.name,
            debugInfo.parentName,
            debugInfo.baseModuleNames
          );
        }

        const statePrefix = isProtocol
          ? PROTOKIT_PREFIXES.STATE_PROTOCOL
          : PROTOKIT_PREFIXES.STATE_RUNTIME;
        const path = Path.fromProperty(this.name, propertyKey, statePrefix);
        if (reference) {
          const { value } = reference;
          value.path = path;
          value.stateServiceProvider = this.parent.stateServiceProvider;
        }
        return reference?.value;
      },

      set: function set(
        this: TargetTransitioningModule & any,
        newValue: WithPath & WithStateServiceProvider
      ) {
        this[`protokit_state_cache_${propertyKey}`] = createReference(newValue);
      },
    });
  };
}
