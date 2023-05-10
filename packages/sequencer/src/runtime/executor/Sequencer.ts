import type { DependencyContainer } from "tsyringe";
import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import { GraphqlServer } from "../../graphql/GraphqlServer.js";

@injectable()
@scoped(Lifecycle.ContainerScoped)
export class Sequencer {

  public constructor(
    @inject("container") private readonly runtimeContainer: DependencyContainer
  ) {
  }

  public async start(){

    const graphql = this.runtimeContainer.resolve(GraphqlServer);
    await graphql.start();

  }

}