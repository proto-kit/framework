/**
 * Test seam for unit tests.
 *
 * We re-export `o1js.checkZkappTransaction` under a local module path so Jest can
 * reliably mock it in ESM mode via `jest.unstable_mockModule(...)` without
 * mocking `o1js` itself.
 */
import { checkZkappTransaction } from "o1js";

export const checkZkappTransactionStatus = checkZkappTransaction;
