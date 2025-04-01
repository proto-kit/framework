import { AsyncStateService } from "../async/AsyncStateService";

export interface StateServiceCreator {
  createMask(name: string, parent: string): Promise<AsyncStateService>;
  getMask(name: string): AsyncStateService;
  mergeIntoParent(name: string): Promise<void>;
  drop(name: string): Promise<void>;
}

// TODO Add Prefix
