import { Chain, RuntimeModules } from '../chain/Chain';

/* eslint-disable import/prefer-default-export */
export class RuntimeModule {
  public name?: string;

  public chain?: Chain<any>;
}
