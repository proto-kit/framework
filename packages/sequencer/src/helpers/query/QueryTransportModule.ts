import { Field } from "o1js";
import { RollupMerkleTreeWitness } from "@proto-kit/common";

export interface QueryTransportModule {
  get: (key: Field) => Promise<Field[] | undefined>;
  merkleWitness: (key: Field) => Promise<RollupMerkleTreeWitness | undefined>;
}
