import { Bool, Provable } from "o1js";
import { container } from "tsyringe";
import { log } from "@proto-kit/common";

import { RuntimeMethodExecutionContext } from "../context/RuntimeMethodExecutionContext";

/**
 * Maintains an execution status of the current runtime module method,
 * while prioritizing one-time failures. The assertion won't change the
 * execution status if it has previously failed at least once within the
 * same method execution context.
 *
 * @param condition - Result of the assertion made about the execution status
 * @param message - Optional message describing the prior status
 */
export function assert(condition: Bool, message?: string | (() => string)) {
  const executionContext = container.resolve(RuntimeMethodExecutionContext);
  const previousStatus = executionContext.current().result.status;
  const status = condition.and(previousStatus);

  Provable.asProver(() => {
    if (!condition.toBoolean() && previousStatus.toBoolean()) {
      const messageString =
        message !== undefined && typeof message === "function"
          ? message()
          : message;

      // If no isSimulated was set, we treat it as not simulated,
      // therefore printing the log
      if (!(executionContext.current().isSimulated ?? false)) {
        log.debug("Assertion failed: ", messageString);
      }
      executionContext.setStatusMessage(messageString, new Error().stack);
    }
  });

  executionContext.setStatus(status);
}
