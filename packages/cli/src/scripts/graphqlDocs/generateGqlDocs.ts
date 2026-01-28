/* eslint-disable no-console */
import {
  BlockStorageNetworkStateModule,
  InMemoryTransactionSender,
  StateServiceQueryModule,
} from "@proto-kit/sdk";
import { Protocol } from "@proto-kit/protocol";
import {
  AppChain,
  Sequencer,
  VanillaTaskWorkerModules,
} from "@proto-kit/sequencer";
import {
  InMemorySequencerModules,
  VanillaProtocolModules,
  VanillaRuntimeModules,
} from "@proto-kit/library";
import {
  GraphqlSequencerModule,
  GraphqlServer,
  VanillaGraphqlModules,
} from "@proto-kit/api";
import { Runtime } from "@proto-kit/module";

import { generateGqlDocs } from "../../utils/graphqlDocs";

export async function generateGqlDocsCommand(args: {
  empty: boolean;
  port: number;
  url: string;
}) {
  if (args.empty) {
    const { port } = args;
    console.log(`Starting AppChain on port ${port}...`);

    const appChain = AppChain.from({
      Runtime: Runtime.from(VanillaRuntimeModules.with({})),
      Protocol: Protocol.from(VanillaProtocolModules.with({})),
      Sequencer: Sequencer.from(
        InMemorySequencerModules.with({
          GraphqlServer: GraphqlServer,
          Graphql: GraphqlSequencerModule.from(VanillaGraphqlModules.with({})),
        })
      ),
      TransactionSender: InMemoryTransactionSender,
      QueryTransportModule: StateServiceQueryModule,
      NetworkStateTransportModule: BlockStorageNetworkStateModule,
    });

    appChain.configurePartial({
      Runtime: VanillaRuntimeModules.defaultConfig(),
      Protocol: VanillaProtocolModules.defaultConfig(),
      Sequencer: {
        Database: {},
        TaskQueue: {},
        LocalTaskWorkerModule: VanillaTaskWorkerModules.defaultConfig(),
        Mempool: {},
        BlockProducerModule: {},
        SequencerStartupModule: {},
        BlockTrigger: { blockInterval: 5000, produceEmptyBlocks: true },
        FeeStrategy: {},
        BaseLayer: {},
        BatchProducerModule: {},
        Graphql: VanillaGraphqlModules.defaultConfig(),
        GraphqlServer: { port, host: "localhost", graphiql: true },
      },
    });

    await appChain.start();
    console.log("AppChain started successfully!");

    const gqlUrl = `http://localhost:${port}/graphql`;
    await generateGqlDocs(gqlUrl);
    await appChain.close();
  } else {
    console.log(`Using existing GraphQL endpoint: ${args.url}`);
    await generateGqlDocs(args.url);
  }
}
/* eslint-enable no-console */
