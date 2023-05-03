/* eslint-disable import/prefer-default-export */
/* eslint-disable new-cap */
import { Bool } from 'snarkyjs';

import { runtimeModule } from '../../src/module/decorator.js';
import { RuntimeModule } from '../../src/runtime/RuntimeModule.js';
import { method } from '../../src/method/decorator.js';
import { assert } from '../../src/method/assert.js';

@runtimeModule()
export class Admin extends RuntimeModule {
  @method()
  public isAdmin() {
    assert(Bool(true));
  }
}
