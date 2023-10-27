import { AppChainModule } from "../appChain/AppChainModule";
import { QueryTransportModule } from "@proto-kit/sequencer";
import { Field } from "o1js";
import { GraphqlClient } from "./GraphqlClient";
import { inject, injectable } from "tsyringe";
import { gql } from "@urql/core";

function assertStringArray(array: any): asserts array is string[] {
  if (
    array["length"] === undefined ||
    (array.length > 0 && typeof array[0] !== "string")
  ) {
    throw new Error("Array is not a string[]");
  }
}

@injectable()
export class GraphqlQueryTransportModule
  extends AppChainModule<Record<string, never>>
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

    console.log(`Trying to fetch ${key.toString()}`);

    const queryResult = await this.graphqlClient.client
      .query(query, { path: key.toString() })
      .toPromise();

    console.log("Finished fetching");

    if(queryResult.error === undefined){
      const stringArray = queryResult.data?.state

      if(stringArray === undefined || stringArray === null){
        return undefined;
      }

      assertStringArray(stringArray)
      return stringArray.map((string) => Field(string));
    } else {
      console.log(queryResult.error);
      throw new Error(queryResult.error.message)
    }
  }
}
