import { Field } from "o1js";
import { RollupMerkleWitness } from "@proto-kit/protocol";

export interface QueryTransportModule {
  get: (key: Field) => Promise<Field[] | undefined>;
  merkleWitness: (key: Field) => Promise<RollupMerkleWitness | undefined>;
}
