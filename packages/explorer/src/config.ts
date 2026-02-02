const config = {
  INDEXER_URL:
    process.env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:8081/graphql",
  DASHBOARD_TITLE: process.env.NEXT_PUBLIC_DASHBOARD_TITLE ?? "Explorer",
  DASHBOARD_SLOGAN:
    process.env.NEXT_PUBLIC_DASHBOARD_SLOGAN ??
    "Explore the blockchain. Search in real-time.",
};

export default config;
