<!-- markdownlint-disable -->
<div align="center">
  <img src="https://protokit.dev/logo-dark.svg" height="128">
</div>
<div align="center">
<br />
<!-- markdownlint-restore -->

[![npm version](https://img.shields.io/npm/v/@proto-kit/sdk.svg?style=flat&logo=npm)](https://www.npmjs.com/package/o1js)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue.svg)]()

[![PRs Welcome](https://img.shields.io/badge/Documentation-website-green.svg)](https://protokit.dev)
[![Discord](https://img.shields.io/discord/1155929817070436362?color=green&logo=discord)](https://discord.gg/xdGf2ucppM)

</div>

# 🚧 Protokit App Chain Framework

Welcome to the Protokit repository, a protocol development framework for privacy enabled application chains.

Protokit enables developers to build zero-knowledge, interoperable and privacy preserving application chains with a minimal learning curve.

## 📖 Documentation

Find the documentation for protokit on [our website](https://protokit.dev)

## ⚡ Features

- 🔐 Privacy Enabled
- ♾️ Succint zkVM 
- 🖥️ Supercharged DevX
- 🔧 Modular
- 🤝 Interoperable

## 📜 Other repositories

- [Starter kit](https://github.com/proto-kit/starter-kit): Our starter kit, which serves as a starting point for any new protokit projects.
- [Private Airdrop Workshop](https://github.com/proto-kit/private-airdrop-workshop): Sources for the workshop we held, that showcases protokit and its features.

## ▶️ Quickstart

The fastest way to start building with Protokit is to use the [starter kit](https://github.com/proto-kit/starter-kit).
The starter kit provides a [monorepo](https://en.wikipedia.org/wiki/Monorepo1) aimed at kickstarting application chain development using the Protokit framework.

<Steps>
### Install dependencies

Before you can start building with Protokit, you need to install the following dependencies:

- [Node.js v18](https://nodejs.org/en)
- [pnpm](https://pnpm.io)
- [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Clone the starter kit

```bash
# Clone the starter kit
git clone https://github.com/proto-kit/starter-kit my-chain
cd my-chain

# Ensure you're on the right nodejs version and install dependnecies
nvm use
pnpm install
```

### Run the tests

```bash
# run and watch tests for the `chain` package
pnpm run test --filter=chain -- --watchAll
```


## 📚 License

This project is under the Apache License 2.0.

See [LICENSE](LICENSE.md) for more information.