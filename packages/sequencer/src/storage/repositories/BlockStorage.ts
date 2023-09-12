export interface BlockStorage {
  getCurrentBlockHeight: () => Promise<number>;
  setBlockHeight: (number: number) => Promise<void>;
}
