// @ts-ignore
const config = require("../../jest.config.cjs");

module.exports = {
  ...config,
  collectCoverageFrom: [
    "packages/sequencer/src/**",
    "!**/node_modules/**",
    "!**/dist/**",
  ],
  coverageDirectory: "coverage/sequencer",
};
