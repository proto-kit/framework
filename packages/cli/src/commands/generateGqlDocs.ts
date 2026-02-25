import { CommandModule } from "yargs";

interface GenerateGqlDocsArgs {
  port: number;
  url: string;
  empty: boolean;
}

export const generateGqlDocsCommand: CommandModule<{}, GenerateGqlDocsArgs> = {
  command: "generate-gql-docs",
  describe: "Generate GraphQL docs",
  builder: (yarg) =>
    yarg
      .option("port", {
        alias: "p",
        type: "number",
        default: 8080,
        describe: "Port for the GraphQL server if creating an AppChain",
      })
      .option("url", {
        alias: "u",
        type: "string",
        default: "http://localhost:8080/graphql",
        describe: "GraphQL endpoint to use if not starting AppChain",
      })
      .option("empty", {
        alias: "e",
        type: "boolean",
        default: false,
        describe: "Start a new AppChain instead of using existing URL",
      }),
  handler: async (args) => {
    try {
      const { default: generateGqlDocs } =
        await import("../scripts/graphqlDocs/generateGqlDocs");
      await generateGqlDocs(args);
      process.exit(0);
    } catch (error) {
      console.error("Failed to start AppChain or generate docs:", error);
      process.exit(1);
    }
  },
};
