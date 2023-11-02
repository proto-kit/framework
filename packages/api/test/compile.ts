import {
  GraphqlSequencerModule,
  GraphqlServer,
  NodeStatusResolver,
  QueryGraphqlModule
} from "../src";

const graphqlServer = GraphqlSequencerModule.from({
  modules: {
    NodeStatusResolver,
    QueryGraphqlModule
  },
  config: {
    NodeStatusResolver: {},
    QueryGraphqlModule: {}
  }
})