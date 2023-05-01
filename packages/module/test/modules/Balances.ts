/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-unused-modules */
import { Bool, Circuit, PublicKey, UInt64, isReady } from 'snarkyjs';
import { State } from '../../src/state/State.js';
import { state } from '../../src/state/decorator.js';
import { ProvableStateTransition } from '../../src/stateTransition/StateTransition.js';
import { StateMap } from '../../src/state/StateMap.js';
import { Option } from '../../src/option/Option.js';

await isReady;

export class Balances {
  @state public totalSupply = State.from<UInt64>(UInt64);

  @state public balances = StateMap.from<PublicKey, UInt64>(PublicKey, UInt64);

  public getTotalSupply(): ProvableStateTransition[] {
    const [, stateTransition] = this.totalSupply.get();

    return [stateTransition];
  }

  public setTotalSupply(): ProvableStateTransition[] {
    const stateTransition = this.totalSupply.set(UInt64.from(20));

    return [stateTransition];
  }

  public getBalance(
    address: PublicKey
  ): [Option<UInt64>, ProvableStateTransition] {
    // eslint-disable-next-line no-warning-comments
    // TODO: why does eslint complain when i define
    // the return typo for getBalance manually?
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.balances.get(address);
  }
}
