/* eslint-disable @typescript-eslint/unbound-method, putout/putout */
import loglevel, { LogLevelDesc } from "loglevel";
import { Provable } from "o1js";

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
      logProvable(log.trace, ...args);
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
    // Loglevel prints the stack trace by default. To still be able to use trace
    // inside out application, we use the level, but call debug() under the hood
    if (loglevel.getLevel() <= loglevel.levels.TRACE) {
      loglevel.debug(...args);
    }
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
