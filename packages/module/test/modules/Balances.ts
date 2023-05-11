/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable import/prefer-default-export */
import { PublicKey, UInt64, isReady } from 'snarkyjs';

import { State } from '../../src/state/State.js';
import { state } from '../../src/state/decorator.js';
import { StateMap } from '../../src/state/StateMap.js';
import { Option } from '../../src/option/Option.js';
import { runtimeModule } from '../../src/module/decorator.js';
import { RuntimeModule } from '../../src/runtime/RuntimeModule.js';
import { method } from '../../src/method/decorator.js';

import { Admin } from './Admin.js';

@runtimeModule()
export class Balances extends RuntimeModule {
  @state() public totalSupply = State.from<UInt64>(UInt64);

  @state() public balances = StateMap.from<PublicKey, UInt64>(
    PublicKey,
    UInt64
  );

  public constructor(public admin: Admin) {
    super();
  }

  @method()
  public getTotalSupply() {
    this.totalSupply.get();
  }

  @method()
  public setTotalSupply() {
    this.totalSupply.set(UInt64.from(20));
    this.admin.isAdmin();
  }

  @method()
  public getBalance(address: PublicKey): Option<UInt64> {
    return this.balances.get(address);
  }
}
