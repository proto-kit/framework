import { QueryTransportModule } from "@proto-kit/sequencer";
import { Field } from "o1js";
import { inject, injectable } from "tsyringe";
import { gql } from "@urql/core";
import { RollupMerkleTreeWitness } from "@proto-kit/common";

import { AppChainModule } from "../appChain/AppChainModule";

import { GraphqlClient } from "./GraphqlClient";

function assertStringArray(array: any): asserts array is string[] {
  if (
    array.length === undefined ||
    (array.length > 0 && typeof array[0] !== "string")
  ) {
    throw new Error("Array is not a string[]");
  }
}

function assertBooleanArray(array: any): asserts array is boolean[] {
  if (
    array.length === undefined ||
    (array.length > 0 && typeof array[0] !== "boolean")
  ) {
    throw new Error("Array is not a boolean[]");
  }
}

@injectable()
export class GraphqlQueryTransportModule
  extends AppChainModule
  implements QueryTransportModule
{
  public constructor(
    @inject("GraphqlClient") private readonly graphqlClient: GraphqlClient
  ) {
    super();
  }

  public async get(key: Field): Promise<Field[] | undefined> {
    const query = gql`
      query StateRaw($path: String!) {
        state(path: $path)
      }
    `;

    const queryResult = await this.graphqlClient.client
      .query(query, { path: key.toString() })
      .toPromise();

    if (queryResult.error === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const stringArray = queryResult.data?.state;

      if (stringArray === undefined || stringArray === null) {
        return undefined;
      }

      assertStringArray(stringArray);
      return stringArray.map((string) => Field(string));
    }
    throw new Error(queryResult.error.message);
  }

  public async merkleWitness(
    key: Field
  ): Promise<RollupMerkleTreeWitness | undefined> {
    const query = gql`
      query Witness($path: String!) {
        witness(path: $path) {
          siblings
          isLefts
        }
      }
    `;

    const queryResult = await this.graphqlClient.client
      .query(query, { path: key.toString() })
      .toPromise();

    if (queryResult.error === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const witnessJson = queryResult.data?.witness;

      if (witnessJson === undefined || witnessJson === null) {
        return undefined;
      }

      if (
        witnessJson.siblings === undefined ||
        witnessJson.isLefts === undefined
      ) {
        throw new Error("Witness json object malformed");
      }

      assertStringArray(witnessJson.siblings);
      assertBooleanArray(witnessJson.isLefts);

      return new RollupMerkleTreeWitness(
        RollupMerkleTreeWitness.fromJSON({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          path: witnessJson.siblings,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          isLeft: witnessJson.isLefts,
        })
      );
    }
    throw new Error(queryResult.error.message);
  }
}
