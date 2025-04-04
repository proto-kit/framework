// @ts-ignore
const config = require("../../jest.config.cjs");

module.exports = {
  ...config,
  collectCoverageFrom: [
    "packages/library/src/**",
    "!**/node_modules/**",
    "!**/dist/**",
  ],
  coverageDirectory: "coverage/library",
};
