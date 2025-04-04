// @ts-ignore
const config = require("../../jest.config.cjs");

module.exports = {
  ...config,
  collectCoverageFrom: [
    "packages/indexer/src/**",
    "!**/node_modules/**",
    "!**/dist/**",
    "!packages/indexer/src/api/generated/**",
  ],
  coverageDirectory: "coverage/indexer",
};
