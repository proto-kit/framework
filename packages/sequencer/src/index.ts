import "reflect-metadata"
import {container} from "tsyringe";
import {RollupSetup} from "./RollupSetup.js";
import {MempoolResolver} from "./mempool/graphql/MempoolResolver.js";
import {PrivateMempool} from "./mempool/private/PrivateMempool.js";
import {isReady} from "snarkyjs";

export default {}

await isReady

async function setup(){

    let setup = container.resolve(RollupSetup)
    setup.registerMempoolModule(new PrivateMempool())

    let resolver = container.resolve(MempoolResolver)
    setup.registerGraphqlModule(resolver)

    await setup.start()

}

await setup()
