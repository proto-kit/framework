import { log } from "@proto-kit/common";

const constants = {
  STATE_TRANSITION_BATCH_SIZE: 4,
  BLOCK_ARGUMENT_BATCH_SIZE: 4,
  OUTGOING_MESSAGE_BATCH_SIZE: 1,
};

const prefix = "PROTOKIT";

export const Constants = {
  getConstant<Key extends keyof typeof constants>(
    name: Key,
    transform: (arg: string) => (typeof constants)[Key]
  ): (typeof constants)[Key] {
    const env = process.env[name] ?? process.env[`${prefix}_${name}`];
    if (env !== undefined && env !== null) {
      return transform(env);
    } else {
      return constants[name];
    }
  },

  printAllConstants() {
    const constantsString = Object.keys(constants)
      .map((name) => {
        const constant = Constants.getConstant(name as any, (x) => x);
        return `${name}=${constant}`;
      })
      .join(", ");
    log.info("Protocol constants: ", constantsString);
  },
};
