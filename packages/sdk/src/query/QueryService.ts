import { DependencyContainer } from "tsyringe";
import { Runtime, RuntimeModule, RuntimeModulesRecord } from "@proto-kit/module";
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
  QueryTransportModule,
} from "@proto-kit/sequencer";

export class QueryService<
  RuntimeModules extends RuntimeModulesRecord,
  ProtocolModules extends ProtocolModulesRecord &
    MandatoryProtocolModulesRecord = ProtocolModulesRecord &
    MandatoryProtocolModulesRecord,
> {
  
  // Here, fields are optional for lazy initialization. 
  private QueryTransport?: QueryTransportModule;
  private NetworkStateTransport?: NetworkStateTransportModule;
  private BlockExplorerTransport?: BlockExplorerTransportModule;


  private RuntimeQuery?: Query<RuntimeModule<unknown>, RuntimeModules>;
  private ProtocolQuery?: Query<ProtocolModule<unknown>, ProtocolModules>;
  private NetworkQuery?: NetworkStateQuery;
  private ExplorerQuery?: BlockExplorerQuery;

  public constructor(
    private readonly runtimeInstance: Runtime<RuntimeModules>,
    private readonly protocolInstance: Protocol<ProtocolModules>,
    private readonly container: DependencyContainer
  ) {}


  /**
   * A helper function that resolves QueryTrasnportModule.
   * If not resolved before, it is resolved.  
   * @returns The registered transport module as {@link QueryTrasnportModule}
   */
  private get queryTransport(): QueryTransportModule {
    if (this.QueryTransport === undefined) {
      if (!this.container.isRegistered("QueryTransportModule")) {
        throw new Error(
          "QueryTransportModule is not registered");
      }
      this.QueryTransport =
        this.container.resolve<QueryTransportModule>("QueryTransportModule");
    }
    return this.QueryTransport;
  }

  /**
   * A helper function that resolves NetworkStateTransport.
   * If not resolved before, it is resolved.  
   * @returns The registered transport module as {@link BlockExplorerTransport}
   */
  private get networkStateTransport(): NetworkStateTransportModule {
    if (this.NetworkStateTransport === undefined) {
      if (!this.container.isRegistered("NetworkStateTransportModule")) {
        throw new Error("NetworkStateTransportModule is not registered.");
      }
      this.NetworkStateTransport =
        this.container.resolve<NetworkStateTransportModule>(
          "NetworkStateTransportModule"
        );
    }
    return this.NetworkStateTransport;
  }

  /**
   * A helper function that resolves BlockExplorerTransportModule.
   * If not resolved before, it is resolved.  
   * @returns The registered transport module as {@link BlockExplorerTransport}
   */
  private get blockExplorerTransport(): BlockExplorerTransportModule {
    if (this.BlockExplorerTransport === undefined) {
      if (!this.container.isRegistered("BlockExplorerTransportModule")) {
        throw new Error(
          "BlockExplorerTransportModule is not registered.");
      }
      this.BlockExplorerTransport =
        this.container.resolve<BlockExplorerTransportModule>(
          "BlockExplorerTransportModule"
        );
    }
    return this.BlockExplorerTransport;
  }
}
