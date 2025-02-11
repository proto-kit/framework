import { createReference, Reference } from "@proto-kit/common";

import { State } from "../State";
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

export function createStateGetter<TargetModule extends StatefulModule>(
  target: TargetModule,
  propertyKey: string,
  valueReference: Reference<State<unknown> | undefined>,
  prefix: string,
  debugInfo: { parentName: string; baseModuleNames: string }
) {
  return function getter(this: TargetModule) {
    // const self = this;
    const { value } = valueReference;
    // Short-circuit this to return the state in case its already initialized
    if (value !== undefined && value.path !== undefined) {
      return value;
    }

    if (this.name === undefined) {
      throw errors.missingName(this.constructor.name);
    }

    if (!this.parent) {
      throw errors.missingParent(
        this.constructor.name,
        debugInfo.parentName,
        debugInfo.baseModuleNames
      );
    }

    const path = Path.fromProperty(this.name, propertyKey, prefix);
    if (value) {
      value.path = path;
      value.stateServiceProvider = this.parent.stateServiceProvider;
    }
    return value;
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
    const stateReference = createReference<State<unknown> | undefined>(
      undefined
    );

    const isProtocol = target instanceof TransitioningProtocolModule;
    const statePrefix = isProtocol
      ? PROTOKIT_PREFIXES.STATE_PROTOCOL
      : PROTOKIT_PREFIXES.STATE_RUNTIME;
    const debugInfo = isProtocol
      ? { parentName: "protocol", baseModuleNames: "...Hook" }
      : { parentName: "runtime", baseModuleNames: "RuntimeModule" };

    Object.defineProperty(target, propertyKey, {
      enumerable: true,

      get: createStateGetter(
        target,
        propertyKey,
        stateReference,
        statePrefix,
        debugInfo
      ),

      set: (newValue: State<unknown>) => {
        stateReference.value = newValue;
      },
    });
  };
}
