# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## Unreleased

### Added
- Added missing block detection and recovery in the indexer.[#488](https://github.com/proto-kit/framework/pull/488)
- `@dependencyFactory` for static dependency factory type safety
- Added Mempool sorting [#395](https://github.com/proto-kit/framework/pull/395)
- Introduced dynamic block building and JIT transaction fetching [#394](https://github.com/proto-kit/framework/pull/394)
- Introduced block explorer [#381](https://github.com/proto-kit/framework/pull/381)
- Added CircuitAnalysisModule for easy analysis of protocol circuits [#379](https://github.com/proto-kit/framework/pull/379)
- Separated settlement and bridging functionally, so now settlement can be used without bridging [#376](https://github.com/proto-kit/framework/pull/376)
- Added nightly releases via pkg.pr.new [#384](https://github.com/proto-kit/framework/pull/384)
- Introduced Changelog [#378](https://github.com/proto-kit/framework/pull/378)

### Removed

- Removed `tick` event on `BlockTrigger` [#417](https://github.com/proto-kit/framework/pull/417)

