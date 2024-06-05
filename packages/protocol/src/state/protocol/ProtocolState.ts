import { State } from "../State";
import { Path } from "../../model/Path";
import { TransitioningProtocolModule } from "../../protocol/TransitioningProtocolModule";

const errors = {
  missingName: (className: string) =>
    new Error(
      `Unable to provide a unique identifier for state, ${className} is missing a name. 
      Did you forget to extend your block module with 'extends ...Hook'?`
    ),

  missingProtocol: (className: string) =>
    new Error(
      `Unable to provide 'procotol' for state, ${className} is missing a name. 
      Did you forget to extend your block module with 'extends ...Hook'?`
    ),
};

/**
 * Decorates a runtime module property as state, passing down some
 * underlying values to improve developer experience.
 */
export function protocolState() {
  return <
    TargetTransitioningModule extends TransitioningProtocolModule<unknown>,
  >(
    target: TargetTransitioningModule,
    propertyKey: string
  ) => {
    let value: State<unknown> | undefined;

    Object.defineProperty(target, propertyKey, {
      enumerable: true,

      get: function get() {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const self = this as TargetTransitioningModule;

        if (self.name === undefined) {
          throw errors.missingName(self.constructor.name);
        }

        if (!self.protocol) {
          throw errors.missingProtocol(self.constructor.name);
        }

        // TODO Add Prefix?
        const path = Path.fromProperty(self.name, propertyKey);
        if (value) {
          value.path = path;
          value.stateServiceProvider = self.protocol.stateServiceProvider;
        }
        return value;
      },

      set: (newValue: State<unknown>) => {
        value = newValue;
      },
    });
  };
}
