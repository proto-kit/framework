/* eslint-disable no-undef */
/* eslint-disable import/unambiguous */
/* eslint-disable import/no-commonjs */
/** @type {import('ts-jest').JestConfigWithTsJest} */

module.exports = {
  // because we run tests from within ./packages/<package_name>/
  rootDir: './../../',
  moduleDirectories: ["node_modules", "packages"],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    'o1js/dist/(.*)': '<rootDir>/node_modules/o1js/dist/$1',
    '../../../node_modules/o1js/dist/(.*)': '<rootDir>/node_modules/o1js/dist/$1',
    '../../../../node_modules/o1js/dist/(.*)': '<rootDir>/node_modules/o1js/dist/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: './test/tsconfig.json'
      },
    ],
  },
};
