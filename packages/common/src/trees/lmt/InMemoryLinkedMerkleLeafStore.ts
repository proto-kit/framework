import { Mixin } from "ts-mixer";

import { InMemoryLinkedLeafStore } from "./InMemoryLinkedLeafStore";
import { InMemoryMerkleTreeStorage } from "../sparse/InMemoryMerkleTreeStorage";

export class InMemoryLinkedMerkleLeafStore extends Mixin(
  InMemoryLinkedLeafStore,
  InMemoryMerkleTreeStorage
) {}
