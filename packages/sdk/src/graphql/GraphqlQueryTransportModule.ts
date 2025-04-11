import { QueryTransportModule } from "@proto-kit/sequencer";
import { Field } from "o1js";
import { inject, injectable } from "tsyringe";
import { gql } from "@urql/core";

import { AppChainModule } from "../appChain/AppChainModule";

import { GraphqlClient } from "./GraphqlClient";
import { LinkedMerkleTreeReadWitness } from "@proto-kit/common";

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
  ): Promise<LinkedMerkleTreeReadWitness | undefined> {
    const query = gql`
      query Witness($path: String!) {
        witness(path: $path) {
          leaf {
            value
            path
            nextPath
          }
          merkleWitness {
            siblings
            isLefts
          }
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
        witnessJson.leaf === undefined ||
        witnessJson.merkleWitness.siblings === undefined ||
        witnessJson.merkleWitness.isLefts === undefined
      ) {
        throw new Error("Witness json object malformed");
      }

      assertStringArray(witnessJson.merkleWitness.siblings);
      assertBooleanArray(witnessJson.merkleWitness.isLefts);

      return new LinkedMerkleTreeReadWitness(
        LinkedMerkleTreeReadWitness.fromJSON({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          leaf: witnessJson.leaf,
          merkleWitness: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            path: witnessJson.merkleWitness.siblings,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            isLeft: witnessJson.merkleWitness.isLefts,
          },
        })
      );
    }
    throw new Error(queryResult.error.message);
  }
}
