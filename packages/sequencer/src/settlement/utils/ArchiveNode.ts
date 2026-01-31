/* eslint-disable no-inner-declarations */
import { log, sleep } from "@proto-kit/common";

import type { MinaBaseLayerConfig } from "../../protocol/baselayer/MinaBaseLayer";

export namespace ArchiveNode {
  const networkStateQuery = `query Height {
  bestChain(maxLength: 1) {
    protocolState {
      consensusState {
        blockHeight
      }
    }
  }
}`;

  type NetworkStateQueryResult = {
    bestChain: {
      protocolState: {
        consensusState: {
          blockHeight: string;
        };
      };
    }[];
  };

  const archiveNodeMaxBlockHeightQuery = `query Height {
  networkState {
    maxBlockHeight {
      canonicalMaxBlockHeight
      pendingMaxBlockHeight
    }
  }
}`;

  type ArchiveNodeMaxBlockHeightQueryResponse = {
    networkState: {
      maxBlockHeight: {
        pendingMaxBlockHeight: number;
        canonicalMaxBlockHeight: number;
      };
    };
  };

  async function makeGraphqlQuery<Response>(
    query: string,
    endpoint: string
  ): Promise<Response> {
    const result = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: query,
      }),
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const json = await result.json();
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return json.data as Response;
  }

  async function waitOnArchiveNodeCatchup(
    archiveNodeEndpoint: string,
    blockHeight: number,
    {
      numAttempts,
      timeout,
      type,
    }: { numAttempts: number; timeout: number; type: string }
  ): Promise<number> {
    for (let i = 0; i < numAttempts; i++) {
      const archiveNodeResponse =
        // eslint-disable-next-line no-await-in-loop
        await makeGraphqlQuery<ArchiveNodeMaxBlockHeightQueryResponse>(
          archiveNodeMaxBlockHeightQuery,
          archiveNodeEndpoint
        );
      const archiveNodeTip: number =
        archiveNodeResponse.networkState.maxBlockHeight.pendingMaxBlockHeight;

      if (archiveNodeTip >= blockHeight) {
        if (type === "lightnet" && archiveNodeTip + 10 > blockHeight) {
          log.warn(
            `Archive node height ${archiveNodeTip} is much greater than requested network block height ${blockHeight}. ` +
              "This is probably because you restarted lightnet but didn't clear out the archive node's database"
          );
        }
        return archiveNodeTip;
      }
      // eslint-disable-next-line no-await-in-loop
      await sleep(timeout);
    }
    throw new Error(
      `Archive node hasn't caught up with blockheight ${blockHeight}`
    );
  }

  export async function waitOnSync({ network }: MinaBaseLayerConfig) {
    if (network.type === "lightnet" || network.type === "remote") {
      const result = await makeGraphqlQuery<NetworkStateQueryResult>(
        networkStateQuery,
        network.graphql
      );
      const tipString: string =
        result.bestChain[0].protocolState.consensusState.blockHeight;
      const tip = parseInt(tipString, 10);

      return await waitOnArchiveNodeCatchup(network.archive, tip, {
        numAttempts: 10,
        timeout: 5000,
        type: network.type,
      });
    }
    // For local blockchain
    // eslint-disable-next-line no-bitwise
    return 1 << 32;
  }
}
/* eslint-enable no-inner-declarations */
