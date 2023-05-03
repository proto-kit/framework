import {container, injectable} from "tsyringe";
import {GraphqlModule} from "./graphql/GraphqlModule.js";
import {GraphqlServer} from "./graphql/GraphqlServer.js";
import {Mempool} from "./mempool/Mempool.js";

@injectable()
export class RollupSetup {

    registerMempoolModule(mempool: Mempool){
        container.registerInstance("mempool", mempool)
    }

    registerGraphqlModule(module: GraphqlModule<any>){

        container.registerInstance<GraphqlModule<any>>("GraphqlModule", module)

    }

    async start(){

        let graphql = container.resolve(GraphqlServer)
        await graphql.start()

    }

}