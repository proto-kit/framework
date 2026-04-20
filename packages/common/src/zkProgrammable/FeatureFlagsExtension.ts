import { FeatureFlags } from "o1js";

function combineFeatureFlag(a: boolean | undefined, b: boolean | undefined) {
  // If both are true => true
  // If one or both are undefined (maybe) => maybe
  // If both are none => none
  if (a === true && b === true) {
    return true;
  } else if (a === undefined || b === undefined) {
    return undefined;
  } else {
    return false;
  }
}

export function combineFeatureFlags(
  a: FeatureFlags,
  b: FeatureFlags
): FeatureFlags {
  return {
    xor: combineFeatureFlag(a.xor, b.xor),
    rot: combineFeatureFlag(a.rot, b.rot),
    lookup: combineFeatureFlag(a.lookup, b.lookup),
    foreignFieldAdd: combineFeatureFlag(a.foreignFieldAdd, b.foreignFieldAdd),
    foreignFieldMul: combineFeatureFlag(a.foreignFieldMul, b.foreignFieldMul),
    rangeCheck0: combineFeatureFlag(a.rangeCheck0, b.rangeCheck0),
    rangeCheck1: combineFeatureFlag(a.rangeCheck1, b.rangeCheck1),
    runtimeTables: combineFeatureFlag(a.runtimeTables, b.runtimeTables),
  };
}
