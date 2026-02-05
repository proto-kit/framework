import { CommandModule } from "yargs";

interface ExplorerStartArgs {
  port: number;
  "indexer-url"?: string;
  "dashboard-title"?: string;
  "dashboard-slogan"?: string;
}

export const explorerStartCommand: CommandModule<{}, ExplorerStartArgs> = {
  command: "start",
  describe: "Start the explorer UI",
  builder: (yarg) =>
    yarg
      .option("port", {
        alias: "p",
        type: "number",
        default: 5003,
        describe: "port to run the explorer on",
      })
      .option("indexer-url", {
        type: "string",
        describe: "GraphQL endpoint URL for the indexer",
      })
      .option("dashboard-title", {
        type: "string",
        default: "Protokit Explorer",
        describe: "Title for the explorer dashboard",
      })
      .option("dashboard-slogan", {
        type: "string",
        default: "Explore your Protokit AppChain",
        describe: "Slogan for the explorer dashboard",
      }),
  handler: async (args) => {
    try {
      const { default: explorerStart } = await import(
        "../../scripts/explorer/start"
      );
      await explorerStart({
        port: args.port,
        indexerUrl: args["indexer-url"],
        dashboardTitle: args["dashboard-title"],
        dashboardSlogan: args["dashboard-slogan"],
      });
      process.exit(0);
    } catch (error) {
      console.error("Failed to start explorer:", error);
      process.exit(1);
    }
  },
};
