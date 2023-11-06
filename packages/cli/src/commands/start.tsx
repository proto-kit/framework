/* eslint-disable */
import "reflect-metadata";
import { Field, PrivateKey, PublicKey, UInt64 } from "o1js";
import {
  Runtime,
  runtimeMethod,
  RuntimeModule,
  runtimeModule,
  RuntimeModulesRecord,
  state,
} from "@proto-kit/module";
import {
  AccountStateModule,
  Option,
  State,
  StateMap,
  VanillaProtocol,
} from "@proto-kit/protocol";
import { Presets, log, TypedClass } from "@proto-kit/common";
import {
  AsyncStateService,
  BlockProducerModule,
  ComputedBlock,
  LocalTaskQueue,
  LocalTaskWorkerModule,
  ManualBlockTrigger,
  NoopBaseLayer,
  PrivateMempool,
  Sequencer,
  TimedBlockTrigger,
  UnsignedTransaction,
} from "@proto-kit/sequencer";
import {
  BlockStorageResolver,
  GraphqlSequencerModule,
  GraphqlServer,
  MempoolResolver,
  NodeStatusResolver,
  QueryGraphqlModule,
} from "@proto-kit/api";
import {
  AppChain,
  InMemorySigner,
  InMemoryTransactionSender,
  StateServiceQueryModule,
  TestingAppChain,
} from "@proto-kit/sdk";

import React, { useEffect, useReducer, useMemo } from "react";
// @ts-ignore
import { render, Text, Box } from "ink";
// @ts-ignore
import { Spinner } from "@inkjs/ui";

export async function startServer({
  runtime,
}: {
  runtime: TypedClass<Runtime<RuntimeModulesRecord>>;
}) {
  const appChain = AppChain.from({
    runtime,

    protocol: VanillaProtocol.from(
      {},
      { AccountState: {}, StateTransitionProver: {}, BlockProver: {} }
    ),

    sequencer: Sequencer.from({
      modules: {
        Mempool: PrivateMempool,
        GraphqlServer,
        LocalTaskWorkerModule,
        BaseLayer: NoopBaseLayer,
        BlockProducerModule,
        BlockTrigger: ManualBlockTrigger,
        TaskQueue: LocalTaskQueue,

        Graphql: GraphqlSequencerModule.from({
          modules: {
            MempoolResolver,
            QueryGraphqlModule,
            BlockStorageResolver,
            NodeStatusResolver,
          },

          config: {
            MempoolResolver: {},
            QueryGraphqlModule: {},
            BlockStorageResolver: {},
            NodeStatusResolver: {},
          },
        }),
      },
    }),

    modules: {
      Signer: InMemorySigner,
      TransactionSender: InMemoryTransactionSender,
      QueryTransportModule: StateServiceQueryModule,
    },
  });

  appChain.configure({
    Runtime: {
      Balances: {},
    },

    Protocol: {
      BlockProver: {},
      StateTransitionProver: {},
      AccountState: {},
    },

    Sequencer: {
      GraphqlServer: {
        port: 8080,
        host: "0.0.0.0",
        graphiql: true,
      },

      Graphql: {
        QueryGraphqlModule: {},
        MempoolResolver: {},
        BlockStorageResolver: {},
        NodeStatusResolver: {},
      },

      Mempool: {},
      BlockProducerModule: {},
      LocalTaskWorkerModule: {},
      BaseLayer: {},
      TaskQueue: {},

      BlockTrigger: {
        blocktime: 5000,
      },
    },

    TransactionSender: {},
    QueryTransportModule: {},

    Signer: {
      signer: PrivateKey.random(),
    },
  });

  await appChain.start();

  return appChain;
}

let appChain: AppChain<any, any, any, any>;

export interface ComputedBlockExtras {
  block?: ComputedBlock;
  blockError?: string;
  height: number;
  duration: number;
}

export interface CliState {
  blocks: ComputedBlockExtras[];
  isProducingBlock: boolean;
  isStarted: boolean;
  countdown: number;
}

export type Action =
  | { type: "HAS_STARTED" }
  | { type: "PRODUCING_BLOCK" }
  | { type: "BLOCK_PRODUCED"; block: ComputedBlockExtras }
  | { type: "TICK" };

export function reducer(state: CliState, action: Action) {
  switch (action.type) {
    case "HAS_STARTED": {
      return {
        ...state,
        isStarted: true,
      };
    }

    case "PRODUCING_BLOCK": {
      return {
        ...state,
        isProducingBlock: true,
      };
    }

    case "BLOCK_PRODUCED": {
      return {
        ...state,
        isProducingBlock: false,
        blocks: state.blocks.concat([action.block]),
        countdown,
      };
    }

    case "TICK": {
      return {
        ...state,
        countdown:
          state.countdown !== 0 ? state.countdown - 1000 : state.countdown,
      };
    }

    default: {
      return state;
    }
  }
}

export const countdown = 5000;
export const initialState: CliState = {
  blocks: [],
  isProducingBlock: false,
  isStarted: false,
  countdown,
};

export function Welcome() {
  return (
    <Box flexDirection={"column"} borderStyle="single" padding="1" width="50%">
      <Box marginBottom={1}>
        <Text bold>Protokit sandbox network</Text>
      </Box>
      <Text>
        <Text bold>Sequencer API:</Text> http://localhost:8080/graphql
      </Text>
      <Text>
        <Text bold>GraphiQL UI:</Text> http://localhost:8080/graphql
      </Text>
    </Box>
  );
}

export function Blocks({ blocks }: { blocks: CliState["blocks"] }) {
  return (
    <Box flexDirection={"column"} marginTop={1}>
      {blocks.map((block, index) => (
        <Box
          flexDirection={"column"}
          key={index}
          width={"100%"}
          marginBottom={1}
        >
          <Text>
            <Text>{block.blockError ? "❌" : "✅"}</Text>
            <Text bold> Block #{block.height}</Text> ({block.duration}ms)
          </Text>
          {block.blockError ? (
            <Box>
              <Text>Error: {block.blockError}</Text>
            </Box>
          ) : (
            <></>
          )}
        </Box>
      ))}
    </Box>
  );
}

export function Server({ configFile }: { configFile: string }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    (async () => {
      appChain = (await import(configFile)).default;
      await appChain.start();
      dispatch({ type: "HAS_STARTED" });
    })();
  }, []);

  useEffect(() => {
    if (!state.isStarted) return;

    const intervalId = setInterval(async () => {
      if (state.isProducingBlock || !state.isStarted) return;
      dispatch({ type: "TICK" });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [state.isStarted, state.isProducingBlock]);

  const blockHeight = useMemo(
    () => state.blocks.filter((block) => !block.blockError).length,
    [state.blocks]
  );

  useEffect(() => {
    if (state.countdown !== 0 || state.isProducingBlock) return;
    (async () => {
      const trigger = appChain.sequencer.resolveOrFail(
        "BlockTrigger",
        ManualBlockTrigger
      );
      dispatch({ type: "PRODUCING_BLOCK" });
      const timeStart = Date.now();
      let blockError;
      let block;

      try {
        block = await trigger.produceBlock();
      } catch (e: any) {
        blockError = e.message;
      }

      const timeEnd = Date.now() - timeStart;
      dispatch({
        type: "BLOCK_PRODUCED",
        block: {
          block,
          blockError,
          height: blockHeight + 1,
          duration: timeEnd,
        },
      });
    })();
  }, [state.countdown, state.isProducingBlock, blockHeight]);

  return (
    <>
      <Welcome />
      <Blocks blocks={state.blocks} />
      <Box>
        {!state.isStarted ? (
          <Spinner label="Starting chain..." />
        ) : state.isProducingBlock ? (
          <Spinner label={`Producing block...`} />
        ) : (
          <Spinner
            label={`Producing next block in ${state.countdown / 1000}s`}
          />
        )}
      </Box>
    </>
  );
}

export function start(argv: { configFile: string }) {
  render(<Server configFile={`${process.cwd()}/${argv.configFile}`} />);
}
