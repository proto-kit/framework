/* eslint-disable no-undef */
/* eslint-disable import/unambiguous */
/* eslint-disable import/no-commonjs */
/** @type {import('ts-jest').JestConfigWithTsJest} */

module.exports = {
  // because we run tests from within ./packages/<package_name>/
  rootDir: "./../../",
  moduleDirectories: ["node_modules", "packages"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "o1js/dist/(.*)": "<rootDir>/node_modules/o1js/dist/$1",
    "../../../node_modules/o1js/dist/(.*)":
      "<rootDir>/node_modules/o1js/dist/$1",
    "../../../../node_modules/o1js/dist/(.*)":
      "<rootDir>/node_modules/o1js/dist/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  collectCoverage: true,
  coverageReporters: ["json", "text", "text-summary"],
  // TODO: enable
  // coverageThreshold: {
  //   branches: 70,
  //   functions: 70,
  //   lines: 70,
  //   statements: 70,
  // },
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    "^.+\\.ts?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "./test/tsconfig.json",
      },
    ],
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "./test/tsconfig.json",
      },
    ],
  },
  setupFilesAfterEnv: ["./console-jest.config.js"],
};
