import padEnd from "lodash/padEnd";
import mapValues from "lodash/mapValues";

const length = 20;
function padToHashPrefix(s: string): string {
  if (s.length > 20) {
    throw new Error(`Prefix string ${s} is too long (max ${length})`);
  }
  return padEnd(s, length, "*");
}

function padPrefixRecord<T extends Record<string, string>>(
  record: T
): {
  [Key in keyof T]: string;
} {
  return mapValues(record, padToHashPrefix);
}

export const PROTOKIT_PREFIXES = padPrefixRecord({
  STATE_PROTOCOL: "pk-protocol-state",
  STATE_RUNTIME: "pk-runtime-state",
});
