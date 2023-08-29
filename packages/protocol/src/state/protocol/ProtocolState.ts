import { State } from "../State";
import { ToFieldable } from "../../model/Option";
import { Path } from "../../model/Path";
import { BlockModule } from "../../protocol/BlockModule";
import { ProtocolMethodExecutionContext } from "../context/ProtocolMethodExecutionContext";

const errors = {
  missingName: (className: string) =>
    new Error(
      `Unable to provide a unique identifier for state, ${className} is missing a name. 
      Did you forget to extend your block module with 'extends BlockModule'?`
    ),

  missingProtocol: (className: string) =>
    new Error(
      `Unable to provide 'procotol' for state, ${className} is missing a name. 
      Did you forget to extend your block module with 'extends BlockModule'?`
    ),
};

/**
 * Decorates a runtime module property as state, passing down some
 * underlying values to improve developer experience.
 */
export function protocolState() {
  return (target: BlockModule, propertyKey: string) => {
    // eslint-disable-next-line @typescript-eslint/init-declarations
    let value: State<ToFieldable> | undefined;

    Object.defineProperty(target, propertyKey, {
      enumerable: true,

      get: function get() {
        if (target.name === undefined) {
          throw errors.missingName(target.constructor.name);
        }

        if (!target.protocol) {
          throw errors.missingProtocol(target.constructor.name);
        }

        const path = Path.fromProperty(target.name, propertyKey);
        if (value) {
          value.path = path;
          value.stateServiceProvider = target.protocol.stateServiceProvider;
          value.contextType = ProtocolMethodExecutionContext;
        }
        return value;
      },

      set: (newValue: State<ToFieldable>) => {
        value = newValue;
      },
    });
  };
}
