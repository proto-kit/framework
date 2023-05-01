/* eslint-disable new-cap */
/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-unused-modules */
import { Bool, Circuit, PublicKey, UInt64, isReady } from 'snarkyjs';
import { State } from '../../src/state/State.js';
import { state } from '../../src/state/decorator.js';
import { ProvableStateTransition } from '../../src/stateTransition/StateTransition.js';

await isReady;

export class Balances {
  @state public totalSupply = State.from<UInt64>(UInt64);

  public getTotalSupply(): ProvableStateTransition[] {
    const [, stateTransition] = this.totalSupply.get();

    return [stateTransition];
  }

  public setTotalSupply(): ProvableStateTransition[] {
    const stateTransition = this.totalSupply.set(UInt64.from(20));

    return [stateTransition];
  }
}
