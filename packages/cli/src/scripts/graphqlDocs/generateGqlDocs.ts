import { generateGqlDocs } from "../../utils/graphqlDocs";

export default async function (args: {
  empty: boolean;
  port: number;
  url: string;
}) {
  if (args.empty) {
    const {
      BlockStorageNetworkStateModule,
      InMemoryTransactionSender,
      StateServiceQueryModule,
    } = await import("@proto-kit/sdk");
    const { Protocol } = await import("@proto-kit/protocol");
    const { AppChain, Sequencer, VanillaTaskWorkerModules } =
      await import("@proto-kit/sequencer");
    const {
      InMemorySequencerModules,
      VanillaProtocolModules,
      VanillaRuntimeModules,
    } = await import("@proto-kit/library");
    const { GraphqlSequencerModule, VanillaGraphqlModules } =
      await import("@proto-kit/api");
    const { Runtime } = await import("@proto-kit/module");
    const { port } = args;
    console.log(`Starting AppChain on port ${port}...`);

    const appChain = AppChain.from({
      Runtime: Runtime.from(VanillaRuntimeModules.with({})),
      Protocol: Protocol.from(VanillaProtocolModules.with({})),
      Sequencer: Sequencer.from(
        InMemorySequencerModules.with({
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
        WorkerModule: VanillaTaskWorkerModules.defaultConfig(),
        Mempool: {},
        BlockProducerModule: {},
        SequencerStartupModule: {},
        BlockTrigger: { blockInterval: 5000, produceEmptyBlocks: true },
        FeeStrategy: {},
        BaseLayer: {},
        BatchProducerModule: {},
        Graphql: {
          ...VanillaGraphqlModules.defaultConfig(),
          port,
          host: "localhost",
          graphiql: true,
        },
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
