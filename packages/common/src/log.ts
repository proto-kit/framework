/* eslint-disable @typescript-eslint/unbound-method, putout/putout */
import loglevel, { LogLevelDesc } from "loglevel";
import { Provable } from "snarkyjs";

function logProvable(
  logFunction: (...args: unknown[]) => void,
  ...args: any[]
) {
  Provable.asProver(() => {
    const prettyArguments = [];
    for (const argument of args) {
      if (argument?.toPretty !== undefined) {
        prettyArguments.push(argument.toPretty());
      } else {
        try {
          prettyArguments.push(JSON.parse(JSON.stringify(argument)));
        } catch {
          prettyArguments.push(argument);
        }
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    logFunction(...prettyArguments);
  });
}

export const log = {
  provable: {
    info: (...args: unknown[]) => {
      logProvable(loglevel.info, ...args);
    },

    debug: (...args: unknown[]) => {
      logProvable(loglevel.debug, ...args);
    },

    error: (...args: unknown[]) => {
      logProvable(loglevel.error, ...args);
    },

    trace: (...args: unknown[]) => {
      logProvable(loglevel.trace, ...args);
    },

    warn: (...args: unknown[]) => {
      logProvable(loglevel.warn, ...args);
    },
  },

  info: (...args: unknown[]) => {
    loglevel.info(...args);
  },

  debug: (...args: unknown[]) => {
    loglevel.debug(...args);
  },

  error: (...args: unknown[]) => {
    loglevel.error(...args);
  },

  trace: (...args: unknown[]) => {
    loglevel.trace(...args);
  },

  warn: (...args: unknown[]) => {
    loglevel.warn(...args);
  },

  setLevel: (level: LogLevelDesc) => {
    loglevel.setLevel(level);
  },

  get levels() {
    return loglevel.levels;
  },

  getLevel: () => loglevel.getLevel(),
};
