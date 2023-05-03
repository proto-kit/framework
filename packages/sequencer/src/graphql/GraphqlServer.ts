import {buildTypeDefsAndResolvers, NonEmptyArray} from "type-graphql";
import {container, injectable, injectAll} from "tsyringe";
import {GraphqlModule} from "./GraphqlModule.js";
import {MempoolResolver} from "../mempool/graphql/MempoolResolver.js";
import {createYoga} from "graphql-yoga";
import {buildSchema} from "type-graphql";
import express from 'express';
// import {startStandaloneServer} from "@apollo/server/standalone";
// import {ApolloServerPluginLandingPageLocalDefault} from "@apollo/server/plugin/landingPage/default";

@injectable()
export class GraphqlServer {

    modules: GraphqlModule<any>[]
    constructor(@injectAll("GraphqlModule") modules: GraphqlModule<any>[]) {
        this.modules = modules
    }

    async start(){
        // Building schema
        const schema = await buildSchema({
            resolvers: [this.modules[0].resolverType, ...this.modules.slice(1).map(x => x.resolverType)],
            // resolvers: [MempoolResolver as Function],
            container: { get: (cls) => container.resolve(cls) },
            validate: {
                enableDebugMessages: true
            }
        })

        let yoga = createYoga({ schema: schema, graphiql: true })

        let server = express()

        server.use('/graphql', yoga)

        server.listen(8080, () => {
            console.log('Running a GraphQL API server at http://localhost:8080/graphql')
        })

        // Create the GraphQL server
        // const server = new ApolloServer({
        //     resolvers: schema.resolvers,
        //     typeDefs: schema.typeDefs,
        //     plugins: [ApolloServerPluginLandingPageLocalDefault({embed: true})]
        // });
        //
        // // Start the server
        // const { url } = await startStandaloneServer(
        //     server,
        //     { listen: { host: "0.0.0.0", port: 8080 } }
        // )
        // console.log(`Server is running, GraphQL Playground available at ${url}`);
    }

}