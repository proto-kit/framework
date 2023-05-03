/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-unused-modules */
import { Bool, Circuit } from 'snarkyjs';
import { container } from 'tsyringe';
import { MethodExecutionContext } from './MethodExecutionContext.js';

export function assert(boolean: Bool) {
  const executionContext = container.resolve(MethodExecutionContext);
  const previousStatus = executionContext.current().status;
  const status = Circuit.if(previousStatus, boolean, previousStatus);
  executionContext.setStatus(status);
}
