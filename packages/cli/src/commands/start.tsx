// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/no-shadow,@typescript-eslint/no-use-before-define,@typescript-eslint/strict-boolean-expressions,@typescript-eslint/no-unsafe-assignment,consistent-return,no-nested-ternary */
import "reflect-metadata";
import { log } from "@proto-kit/common";
import { UnprovenBlock, ManualBlockTrigger } from "@proto-kit/sequencer";
import { AppChain } from "@proto-kit/sdk";
import React, { useEffect, useReducer, useMemo } from "react";
// @ts-ignore
import { render, Text, Box } from "ink";
// @ts-ignore
import { Spinner } from "@inkjs/ui";

log.setLevel("ERROR");

let appChain: AppChain<any, any, any, any>;

export interface UnprovenBlockExtras {
  block?: UnprovenBlock;
  blockError?: string;
  logs: string[];
  height?: number;
  duration: number;
  time: string;
}

export interface CliState {
  blocks: UnprovenBlockExtras[];
  isProducingBlock: boolean;
  isStarted: boolean;
  countdown: number;
}

export type Action =
  | { type: "HAS_STARTED" }
  | { type: "PRODUCING_BLOCK" }
  | { type: "BLOCK_PRODUCED"; block: UnprovenBlockExtras }
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
    <Box>
      <Text> </Text>
      <Box
        flexDirection={"column"}
        marginTop={1}
        borderStyle="single"
        width="60%"
      >
        <Text bold>Protokit sandbox network</Text>
        <Text>
          <Text bold>Sequencer API:</Text> http://localhost:8080/graphql
        </Text>
        <Text>
          <Text bold>GraphiQL UI:</Text> http://localhost:8080/graphql
        </Text>
      </Box>
    </Box>
  );
}

export function Blocks({ blocks }: { blocks: CliState["blocks"] }) {
  return (
    <Box flexDirection={"column"} marginTop={1}>
      {blocks.map((block: UnprovenBlockExtras) => (
        <Box
          flexDirection={"column"}
          key={block.time}
          width={"100%"}
          marginBottom={1}
        >
          <Text>
            <Text color="gray" dimColor>
              [{block.time}]
            </Text>{" "}
            <Text>
              {block.blockError ? "❌" : "✅"}
              {"  "}
            </Text>
            <Text bold>
              Block {block.height !== undefined ? `#${block.height}` : "-"}
            </Text>{" "}
            ({block.duration}ms)
          </Text>

          {block.blockError ? (
            <Box>
              <Text>Error: {block.blockError}</Text>
            </Box>
          ) : (
            <></>
          )}

          {block.logs ? (
            <Box flexDirection="column">
              {block.logs.map((log, index) => (
                <Text key={index}>{log.trim()}</Text>
              ))}
            </Box>
          ) : (
            <Box></Box>
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
      const logs: any[] = [];

      const originalWriteOut = process.stdout.write;
      process.stdout.write = (...args: any[]) => {
        logs.push(args[0].toString());
        return true;
      };

      const originalWriteErr = process.stderr.write;
      process.stderr.write = (...args: any[]) => {
        logs.push(args[0].toString());
        return true;
      };

      try {
        block = await trigger.produceUnproven();
      } catch (e: any) {
        blockError = e.message;
      }

      process.stdout.write = originalWriteOut;
      process.stderr.write = originalWriteErr;

      const timeEnd = Date.now() - timeStart;
      dispatch({
        type: "BLOCK_PRODUCED",
        block: {
          block,
          blockError,
          logs,
          height: block
            ? Number(block?.networkState.during.block.height.toString())
            : undefined,
          duration: timeEnd,
          time: new Date().toLocaleTimeString(),
        },
      });
    })();
  }, [state.countdown, state.isProducingBlock, blockHeight]);

  return (
    <Box flexDirection="column">
      <Welcome></Welcome>
      <Box>
        <Blocks blocks={state.blocks} />
      </Box>
      <Box>
        {!state.isStarted ? (
          <Spinner label="Starting chain..." />
        ) : state.isProducingBlock ? (
          <Spinner label={"Producing block..."} />
        ) : (
          <Spinner
            label={`Producing next block in ${state.countdown / 1000}s`}
          />
        )}
      </Box>
    </Box>
  );
}

export function start(argv: { configFile: string }) {
  render(<Server configFile={`${process.cwd()}/${argv.configFile}`} />, {
    patchConsole: false,
  });
}

// eslint-disable-next-line max-len
/* eslint-enable @typescript-eslint/no-shadow,@typescript-eslint/no-use-before-define,@typescript-eslint/strict-boolean-expressions,@typescript-eslint/no-unsafe-assignment,consistent-return,no-nested-ternary */
