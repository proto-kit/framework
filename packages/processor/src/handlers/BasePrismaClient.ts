// we depend on the prisma client to have at least the $transaction API
// we don't know the specifics of the generated client based on the target schema
export type BasePrismaClient = {
  $transaction: (
    tx: (client: {
      block: {
        create: (args: { data: { height: number } }) => Promise<unknown>;
      };
    }) => Promise<unknown>,
    options?: { maxWait?: number; timeout?: number }
  ) => Promise<unknown>;
  $connect: () => unknown;
  block: {
    findMany: (args: { orderBy: { height: "desc" }; take: number }) => Promise<
      (
        | {
            height: number;
          }
        | undefined
      )[]
    >;
  };
  $executeRawUnsafe: (query: string) => Promise<unknown>;
};
