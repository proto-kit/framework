import path from "path";

import {
  MandatoryProtocolModulesRecord,
  ProtocolModulesRecord,
} from "@proto-kit/protocol";
import { RuntimeModulesRecord } from "@proto-kit/module";
import { ModulesConfig } from "@proto-kit/common";
import { Withdrawals } from "@proto-kit/library";

/* eslint-disable no-console */

type AppRuntimeModules = RuntimeModulesRecord & {
  Withdrawals: typeof Withdrawals;
};

interface RuntimeModule {
  modules: AppRuntimeModules;
  config: ModulesConfig<AppRuntimeModules>;
}

interface ProtocolModule {
  modules: ProtocolModulesRecord & MandatoryProtocolModulesRecord;

  config: ModulesConfig<ProtocolModulesRecord & MandatoryProtocolModulesRecord>;

  settlementModules?: ProtocolModulesRecord;

  settlementModulesConfig?: ModulesConfig<ProtocolModulesRecord>;
}

interface LoadedModules {
  runtime: RuntimeModule;
  protocol: ProtocolModule;
}

export async function loadUserModules(): Promise<LoadedModules> {
  const cwd = process.cwd();

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const runtimeImport: { default: RuntimeModule } = await import(
      path.join(cwd, "src/runtime")
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const protocolImport: { default: ProtocolModule } = await import(
      path.join(cwd, "src/protocol")
    );

    return {
      runtime: runtimeImport.default,
      protocol: protocolImport.default,
    };
  } catch (error) {
    console.error("Failed to load runtime or protocol modules.");
    throw error;
  }
}

/* eslint-enable no-console */
