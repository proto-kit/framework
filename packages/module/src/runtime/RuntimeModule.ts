import type { Chain, RuntimeModules } from '../chain/Chain';

// eslint-disable-next-line import/prefer-default-export
export class RuntimeModule {
  public name?: string;

  public chain?: Chain<RuntimeModules>;
}
