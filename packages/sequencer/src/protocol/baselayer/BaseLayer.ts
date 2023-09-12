import { ComputedBlock } from "../../storage/model/Block";

export interface BaseLayer {
  blockProduced: (block: ComputedBlock) => Promise<void>;
}
