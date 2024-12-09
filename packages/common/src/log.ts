import loglevel, { LogLevelDesc, LogLevelNames } from "loglevel";
import { Provable } from "o1js";

/* eslint-disable @typescript-eslint/no-unsafe-argument */
function logProvable(
  logFunction: (...args: unknown[]) => void,
  ...args: any[]
) {
  Provable.asProver(() => {
    const prettyArguments: string[] = [];

    args.forEach((argument) => {
      if (argument?.toPretty !== undefined) {
        prettyArguments.push(argument.toPretty());
      } else {
        try {
          prettyArguments.push(JSON.parse(JSON.stringify(argument)));
        } catch {
          prettyArguments.push(argument);
        }
      }
    });
    logFunction(...prettyArguments);
  });
}
/* eslint-enable */

const timeMap: Record<string, number> = {};

function time(label = "time") {
  timeMap[label] = Date.now();
}

function timeLog(label = "time"): string {
  const prev = timeMap[label];
  if (prev === undefined) {
    return "Label not found";
  }
  return `${label} took ${Date.now() - prev}ms`;
}

function timeEnd(label = "time"): string {
  const str = timeLog(label);
  delete timeMap[label];
  return str;
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

  time,

  timeLog: {
    info: (label?: string) => loglevel.info(timeLog(label)),
    debug: (label?: string) => loglevel.debug(timeLog(label)),
    error: (label?: string) => loglevel.error(timeLog(label)),
    trace: (label?: string) => loglevel.trace(timeLog(label)),
    warn: (label?: string) => loglevel.warn(timeLog(label)),
  },

  timeEnd: {
    info: (label?: string) => loglevel.info(timeEnd(label)),
    debug: (label?: string) => loglevel.debug(timeEnd(label)),
    error: (label?: string) => loglevel.error(timeEnd(label)),
    trace: (label?: string) => loglevel.trace(timeEnd(label)),
    warn: (label?: string) => loglevel.warn(timeEnd(label)),
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

const validLogLevels = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "SILENT"];

export function assertValidTextLogLevel(
  level: string | number
): asserts level is LogLevelNames {
  if (
    typeof level === "number" ||
    !validLogLevels.includes(level.toUpperCase())
  ) {
    throw new Error(`${level} is not a valid loglevel`);
  }
}
