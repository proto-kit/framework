# Proto-Kit CLI

A comprehensive command-line interface for managing Proto-Kit applications, environments, and blockchain interactions.

## Installation

```bash
npm install @proto-kit/cli
```

Or use with npx:

```bash
npx @proto-kit/cli <command>
```

## Commands Overview

### Environment Management

Creates a new environment configuration with an interactive guided wizard.

```bash
npm protokit wizard
```

This command walks you through setting up:
- Network configuration
- Key management
- Environment variables
- Deployment settings

### Bridge Operations

#### `bridge deposit <tokenId> <fromKey> <toKey> <amount>`
Deposits tokens to the bridge contract.

**Parameters:**
- `tokenId` - Token identifier
- `fromKey` - Sender's private key (or environment variable name)
- `toKey` - Recipient's public key (or environment variable name)  
- `amount` - Amount to deposit

**Example:**
```bash
npm protokit bridge deposit 1 SENDER_KEY RECIPIENT_KEY 100
```

#### `bridge redeem <tokenId> <toKey> <amount>`
Redeems tokens from the bridge contract.

**Parameters:**
- `tokenId` - Token identifier
- `toKey` - Recipient's public key (or environment variable name)
- `amount` - Amount to redeem

**Example:**
```bash
npm protokit bridge redeem 1 RECIPIENT_KEY 100
```

#### `bridge withdraw <tokenId> <senderKey> <amount>`
Withdraws tokens from the bridge.

**Parameters:**
- `tokenId` - Token identifier
- `senderKey` - Sender's private key (or environment variable name)
- `amount` - Amount to withdraw

**Example:**
```bash
npm protokit bridge withdraw 1 SENDER_KEY 100
```

### Settlement Deployment

#### `settlement deploy`
Deploys settlement contracts to the network.

```bash
npm protokit settlement deploy
```

#### `settlement token-deploy <tokenSymbol> <feepayerKey> <receiverPublicKey> [mintAmount]`
Deploys custom fungible tokens for settlement operations.

**Parameters:**
- `tokenSymbol` - Symbol for the token
- `feepayerKey` - Private key for paying deployment fees
- `receiverPublicKey` - Public key to receive initially minted tokens
- `[mintAmount]` - Initial amount to mint (default: 0)

**Example:**
```bash
npm protokit settlement token-deploy USDC FEEPAYER_KEY RECEIVER_KEY 1000
```

### Lightnet Utilities

#### `lightnet:wait-for-network`
Waits for the lightnet network to be ready before proceeding with other operations.

```bash
npm protokit lightnet wait
```

#### `lightnet:faucet <publicKey>`
Sends MINA from the lightnet faucet to the specified account.

**Parameters:**
- `publicKey` - Destination public key (or environment variable name)

**Example:**
```bash
npm protokit lightnet:faucet B62qnzbXQcUoQFnjvF4Kog6KfNsuuSoo7LSLvomPeak2CLvEYiUqT
```

#### `lightnet:initialize`
Complete lightnet setup that performs:
1. Waits for network readiness
2. Funds test accounts from faucet
3. Deploys settlement contracts

```bash
npm protokit lightnet initialize
```

### Developer Tools

#### `generate-keys [count]`
Generates private/public key pairs for development and testing.

**Parameters:**
- `[count]` - Number of key pairs to generate (default: 1)

**Example:**
```bash
# Generate 1 key pair
npm protokit generate-keys

# Generate 5 key pairs
npm protokit generate-keys 5
```

**Output format:**
```
Key Pair 1:
Private Key: EKE8...
Public Key: B62q...

Key Pair 2:
Private Key: EKF9...
Public Key: B62r...
```

#### `explorer:start`
Starts the Proto-Kit explorer web interface.

**Options:**
- `-p, --port` - Port to run on (default: 5003)
- `--indexer-url` - GraphQL endpoint URL for the indexer

**Examples:**
```bash
# Start on default port 5003
npm protokit explorer start

# Start on custom port with indexer URL
npm protokit explorer start -p 3000 --indexer-url http://localhost:8081/graphql
```

## Environment Variable Configuration

The CLI supports three methods for passing environment variables and configuration:

### Option 1: `--env-path` (File-based)
Load environment variables from a `.env` file:

```bash
npm protokit settlement deploy --env-path ./my-config/.env
```

### Option 2: `--set KEY=value` (Inline)
Pass environment variables directly as command-line arguments. Can be used multiple times:

```bash
npm protokit settlement deploy \
  --set PROTOKIT_SETTLEMENT_CONTRACT_PRIVATE_KEY=EK... \
  MINA_NETWORK_URL=https://lightnet.lokinet.dev/graphql
```

### Option 3: `--env {envName}` (Named Environment)
Use a pre-configured environment by name:

```bash
npm protokit settlement deploy --env sovereign
```
