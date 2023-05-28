import "reflect-metadata"
import { GraphQLServerModule } from "../src/graphql/GraphqlSequencerModule.js";

// eslint-disable-next-line jest/no-export
// export class DummyModule implements RuntimeModule {
//
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   public bind(builder: RuntimeBuilder): void {
//
//   }
//
//   public readonly name = "DummyModule";
//
// }

describe("runtime", () => {

  it("should inject dummy module", async () => {

    // const builder = new RuntimeBuilder()

    // let instance = await builder.injectModule<DummyModule>("../../test/Runtime.test.ts", "DummyModule", "DummyModule")

    // expect(instance).toBeDefined()

    // expect(true).toBe(true)

  })

  it("decorator test", async () => {

    // new GraphQLServerModule({host:"", port: 123})

  })

});