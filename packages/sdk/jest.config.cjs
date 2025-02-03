// @ts-ignore
const config = require("../../jest.config.cjs");

module.exports = {
  ...config,
  collectCoverageFrom: [
    "packages/sdk/src/**",
    "!**/node_modules/**",
    "!**/dist/**",
  ],
  coverageDirectory: "coverage/sdk",
};
