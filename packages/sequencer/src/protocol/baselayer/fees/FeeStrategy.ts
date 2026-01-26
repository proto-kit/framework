export interface FeeStrategy {
  getFee(): Promise<number>;
}
