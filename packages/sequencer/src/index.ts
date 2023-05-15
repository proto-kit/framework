import "reflect-metadata";
import { container } from "tsyringe";
import { RollupSetup } from "./RollupSetup.js";
import { MempoolResolver } from "./mempool/graphql/MempoolResolver.js";
import { PrivateMempool } from "./mempool/private/PrivateMempool.js";

export async function setup() {

  const rollupSetup = container.resolve(RollupSetup);
  rollupSetup.registerMempoolModule(new PrivateMempool());

  const resolver = container.resolve(MempoolResolver);
  rollupSetup.registerGraphqlModule(resolver);

  await rollupSetup.start();

}

await setup();
