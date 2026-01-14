export type RuntimeMethodInvocationType = "INCOMING_MESSAGE" | "SIGNATURE";

export type RuntimeMethodIdMapping = Record<
  `${string}.${string}`,
  { methodId: string; type: RuntimeMethodInvocationType }
>;

export interface RuntimeLike {
  get methodIdResolver(): {
    methodIdMap: () => RuntimeMethodIdMapping;
  };
}
