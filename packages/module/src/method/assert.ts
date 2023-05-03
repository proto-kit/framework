/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-unused-modules */
import { type Bool, Circuit } from 'snarkyjs';
import { container } from 'tsyringe';

import { MethodExecutionContext } from './MethodExecutionContext.js';

export function assert(boolean: Bool, message?: string) {
  const executionContext = container.resolve(MethodExecutionContext);
  const previousStatus = executionContext.current().result.status;
  const status = Circuit.if(previousStatus, boolean, previousStatus);
  executionContext.setStatus(status);
  executionContext.setStatusMessage(message);
}
