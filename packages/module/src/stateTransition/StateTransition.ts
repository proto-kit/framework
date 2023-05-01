/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
/* eslint-disable import/prefer-default-export */
import { Field, Struct } from 'snarkyjs';

import { Option, ProvableOption } from '../option/Option.js';

export class ProvableStateTransition extends Struct({
  path: Field,

  // must be applied even if `None`
  from: ProvableOption,

  // must be ignored if `None`
  to: ProvableOption,
}) {
  public static from(path: Field, from: ProvableOption) {
    return new ProvableStateTransition({
      path,
      from,
      to: Option.none().toProvable(),
    });
  }

  public static fromTo(path: Field, from: ProvableOption, to: ProvableOption) {
    return new ProvableStateTransition({
      path,
      from,
      to,
    });
  }
}
