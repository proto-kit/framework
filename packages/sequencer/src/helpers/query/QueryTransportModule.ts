import { Field } from "o1js";
import { LinkedMerkleTreeReadWitness } from "@proto-kit/common";

export interface QueryTransportModule {
  get: (key: Field) => Promise<Field[] | undefined>;
  merkleWitness: (
    key: Field
  ) => Promise<LinkedMerkleTreeReadWitness | undefined>;
}
