import { inject, injectable, Lifecycle, scoped } from "tsyringe";
import {
  Runtime,
  RuntimeModule,
  RuntimeModulesRecord,
} from "@proto-kit/module";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModule,
  ProtocolModulesRecord,
} from "@proto-kit/protocol";
import {
  BlockExplorerQuery,
  BlockExplorerTransportModule,
  NetworkStateQuery,
  NetworkStateTransportModule,
  Query,
  QueryBuilderFactory,
  QueryTransportModule,
} from "@proto-kit/sequencer";

@scoped(Lifecycle.ContainerScoped)
@injectable()
export class QueryService<
  RuntimeModules extends RuntimeModulesRecord,
  ProtocolModules extends ProtocolModulesRecord &
    MandatoryProtocolModulesRecord
> {
  // Lazily initialized query instances
  private RuntimeQuery?: Query<RuntimeModule<unknown>, RuntimeModules>;

  private ProtocolQuery?: Query<ProtocolModule<unknown>, ProtocolModules>;

  private NetworkQuery?: NetworkStateQuery;

  private ExplorerQuery?: BlockExplorerQuery;

  public constructor(
    @inject("Runtime")
    private readonly runtimeInstance: Runtime<RuntimeModules>,
    @inject("Protocol")
    private readonly protocolInstance: Protocol<ProtocolModules>,
    @inject("QueryTransportModule", { isOptional: true })
    private readonly queryTransport: QueryTransportModule,
    @inject("NetworkStateTransportModule", { isOptional: true })
    private readonly networkStateTransport: NetworkStateTransportModule,
    @inject("BlockExplorerTransportModule", { isOptional: true })
    private readonly blockExplorerTransport: BlockExplorerTransportModule
  ) {}

  /**
   * Getter of query module for runtime modules.
   * If not initialized before, it is initialized.
   * @returns A {@link Query} module for runtime module.
   */
  public get runtime(): Query<RuntimeModule<unknown>, RuntimeModules> {
    if (this.RuntimeQuery === undefined) {
      this.RuntimeQuery = QueryBuilderFactory.fromRuntime(
        this.runtimeInstance,
        this.queryTransport
      );
    }
    return this.RuntimeQuery;
  }

  /**
   * Getter of query module for protocol.
   * If not initialized before, it is initialized.
   * @returns A {@link Query} module for protocol module.
   */
  public get protocol(): Query<ProtocolModule<unknown>, ProtocolModules> {
    if (this.ProtocolQuery === undefined) {
      this.ProtocolQuery = QueryBuilderFactory.fromProtocol(
        this.protocolInstance,
        this.queryTransport
      );
    }
    return this.ProtocolQuery;
  }

  /**
   * Getter of network state query module.
   * If not initialized before, it is initialized.
   * @returns A {@link NetworkStateQuery} module.
   */
  public get network(): NetworkStateQuery {
    if (this.NetworkQuery === undefined) {
      this.NetworkQuery = new NetworkStateQuery(this.networkStateTransport);
    }
    return this.NetworkQuery;
  }

  /**
   * Getter of block explorer query module.
   * If not initialized before, it is initialized.
   * @returns A {@link BlockExplorerQuery} module.
   */
  public get explorer(): BlockExplorerQuery {
    if (this.ExplorerQuery === undefined) {
      this.ExplorerQuery = new BlockExplorerQuery(this.blockExplorerTransport);
    }
    return this.ExplorerQuery;
  }
}
