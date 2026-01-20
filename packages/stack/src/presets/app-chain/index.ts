import { ModulesConfig, RecursivePartial } from "@proto-kit/common";
import { Runtime, RuntimeModulesRecord } from "@proto-kit/module";
import {
  MandatoryProtocolModulesRecord,
  Protocol,
  ProtocolModulesRecord,
} from "@proto-kit/protocol";
import {
  AppChain,
  AppChainModulesRecord,
  SequencerModulesRecord,
} from "@proto-kit/sequencer";
import { DefaultModules, DefaultConfigs } from "../modules";
import { DefaultSequencer, DefaultSequencerConfig } from "../sequencer";

export class DefaultAppChain {
  static inmemory(
    runtimeModules: RuntimeModulesRecord,
    protocolModules: ProtocolModulesRecord & MandatoryProtocolModulesRecord,
    options?: {
      overrideAppChainModules?: Partial<AppChainModulesRecord>;
      settlementEnabled?: boolean;
      overrideSequencerModules?: Partial<SequencerModulesRecord>;
    }
  ) {
    return AppChain.from({
      Runtime: Runtime.from(runtimeModules),
      Protocol: Protocol.from(protocolModules),
      Sequencer: DefaultSequencer.inmemory({
        settlementEnabled: options?.settlementEnabled,
        overrideModules: options?.overrideSequencerModules,
      }),
      ...DefaultModules.appChainBase(),
      ...options?.overrideAppChainModules,
    });
  }
  static development(
    runtimeModules: RuntimeModulesRecord,
    protocolModules: ProtocolModulesRecord & MandatoryProtocolModulesRecord,
    options?: {
      overrideAppChainModules?: Partial<AppChainModulesRecord>;
      settlementEnabled?: boolean;
      overrideSequencerModules?: Partial<SequencerModulesRecord>;
    }
  ) {
    return AppChain.from({
      Runtime: Runtime.from(runtimeModules),
      Protocol: Protocol.from(protocolModules),
      Sequencer: DefaultSequencer.development({
        settlementEnabled: options?.settlementEnabled,
        overrideModules: options?.overrideSequencerModules,
      }),
      ...DefaultModules.appChainBase(),
      ...options?.overrideAppChainModules,
    });
  }
  static sovereign(
    runtimeModules: RuntimeModulesRecord,
    protocolModules: ProtocolModulesRecord & MandatoryProtocolModulesRecord,
    options?: {
      overrideAppChainModules?: Partial<AppChainModulesRecord>;
      settlementEnabled?: boolean;
      overrideSequencerModules?: Partial<SequencerModulesRecord>;
    }
  ) {
    return AppChain.from({
      Runtime: Runtime.from(runtimeModules),
      Protocol: Protocol.from(protocolModules),
      Sequencer: DefaultSequencer.sovereign({
        settlementEnabled: options?.settlementEnabled,
        overrideModules: options?.overrideSequencerModules,
      }),
      ...DefaultModules.appChainBase(),
      ...options?.overrideAppChainModules,
    });
  }
}

export class DefaultAppChainConfig {
  static inmemory(options?: {
    overrideAppChainConfig?: RecursivePartial<ModulesConfig<any>>;
    settlementEnabled?: boolean;
    overrideSequencerConfig?: RecursivePartial<ModulesConfig<any>>;
  }) {
    return {
      Sequencer: DefaultSequencerConfig.inmemory({
        settlementEnabled: options?.settlementEnabled,
        overrideConfig: options?.overrideSequencerConfig,
      }),
      ...DefaultConfigs.appChainBase(),
      ...options?.overrideAppChainConfig,
    };
  }
  static development(options?: {
    overrideAppChainConfig?: RecursivePartial<ModulesConfig<any>>;
    settlementEnabled?: boolean;
    overrideSequencerConfig?: RecursivePartial<ModulesConfig<any>>;
  }) {
    return {
      Sequencer: DefaultSequencerConfig.development({
        settlementEnabled: options?.settlementEnabled,
        overrideConfig: options?.overrideSequencerConfig,
      }),
      ...DefaultConfigs.appChainBase(),
      ...options?.overrideAppChainConfig,
    };
  }
  static sovereign(options?: {
    overrideAppChainConfig?: RecursivePartial<ModulesConfig<any>>;
    settlementEnabled?: boolean;
    overrideSequencerConfig?: RecursivePartial<ModulesConfig<any>>;
  }) {
    return {
      Sequencer: DefaultSequencerConfig.sovereign({
        settlementEnabled: options?.settlementEnabled,
        overrideConfig: options?.overrideSequencerConfig,
      }),
      ...DefaultConfigs.appChainBase(),
      ...options?.overrideAppChainConfig,
    };
  }
}
