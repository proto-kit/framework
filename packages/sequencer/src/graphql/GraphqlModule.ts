import type { UnTypedClass } from "@proto-kit/protocol";
import { ConfigurableModule } from "@proto-kit/common";

export abstract class GraphqlModule<Config> extends ConfigurableModule<Config> {
  abstract resolverType: UnTypedClass;
}
