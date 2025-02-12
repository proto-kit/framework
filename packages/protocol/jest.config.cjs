// @ts-ignore
const config = require("../../jest.config.cjs");

module.exports = {
  ...config,
  collectCoverageFrom: [
    "packages/protocol/src/**",
    "!**/node_modules/**",
    "!**/dist/**",
  ],
  coverageDirectory: "coverage/protocol",
};
