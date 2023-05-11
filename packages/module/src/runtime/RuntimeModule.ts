import type { Chain, RuntimeModules } from '../chain/Chain';

/**
 * Base class for runtime modules providing the necessary utilities.
 */
// eslint-disable-next-line import/prefer-default-export
export class RuntimeModule {
  public name?: string;

  public chain?: Chain<RuntimeModules>;
}
