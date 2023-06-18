import type { UntypedClassConstructor } from "@yab/protocol";

export interface GraphqlModule {
  resolverType: UntypedClassConstructor;
}
