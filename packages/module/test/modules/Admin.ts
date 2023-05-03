/* eslint-disable import/prefer-default-export */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
import { Bool, Circuit, PublicKey } from 'snarkyjs';
import { runtimeModule } from '../../src/module/decorator.js';
import { injectable } from 'tsyringe';
import { RuntimeModule } from '../../src/runtime/RuntimeModule.js';
import { method } from '../../src/method/decorator.js';

@runtimeModule()
export class Admin extends RuntimeModule {
  @method()
  public isAdmin() {
    return Bool(true);
  }
}
