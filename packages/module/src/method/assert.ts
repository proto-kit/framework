import { type Bool, Circuit } from "snarkyjs";
import { container } from "tsyringe";

import { MethodExecutionContext } from "./MethodExecutionContext.js";

/**
 * Maintains an execution status of the current runtime module method,
 * while prioritizing one-time failures. The assertion won't change the
 * execution status if it has previously failed at least once within the
 * same method execution context.
 *
 * @param condition - Result of the assertion made about the execution status
 * @param message - Optional message describing the prior status
 */
export function assert(condition: Bool, message?: string) {
  const executionContext = container.resolve(MethodExecutionContext);
  const previousStatus = executionContext.current().result.status;
  const status = Circuit.if(previousStatus, condition, previousStatus);

  // const status = previousStatus.and(condition);
  executionContext.setStatus(status);
  executionContext.setStatusMessage(message);
}
