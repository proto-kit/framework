import {
  RuntimeMethodExecutionContext,
  RuntimeMethodExecutionData,
  StateTransition,
  ProtocolEnvironment,
} from "@proto-kit/protocol";
import { RuntimeEnvironment } from "@proto-kit/module";
import _ from "lodash";
import { Field } from "o1js";

import { AsyncStateService } from "../../../state/async/AsyncStateService";
import { CachedStateService } from "../../../state/state/CachedStateService";
import { distinctByString } from "../../../helpers/utils";
import { SyncCachedStateService } from "../../../state/state/SyncCachedStateService";

export class RuntimeMethodExecution {
  public constructor(
    private readonly runtime: RuntimeEnvironment,
    private readonly protocol: ProtocolEnvironment,
    private readonly executionContext: RuntimeMethodExecutionContext
  ) {}

  private async executeMethodWithKeys(
    method: () => Promise<unknown>,
    contextInputs: RuntimeMethodExecutionData,
    parentStateService: CachedStateService
  ): Promise<StateTransition<unknown>[]> {
    const { executionContext, runtime, protocol } = this;

    executionContext.setup(contextInputs);
    executionContext.setSimulated(true);

    const stateService = new SyncCachedStateService(parentStateService);
    runtime.stateServiceProvider.setCurrentStateService(stateService);
    protocol.stateServiceProvider.setCurrentStateService(stateService);

    // Execute method
    await method();

    const { stateTransitions } = executionContext.current().result;

    // Clear executionContext
    executionContext.afterMethod();
    executionContext.clear();

    runtime.stateServiceProvider.popCurrentStateService();
    protocol.stateServiceProvider.popCurrentStateService();

    return stateTransitions;
  }

  /**
   * Simulates a certain Context-aware method through multiple rounds.
   *
   * For a method that emits n Statetransitions, we execute it n times,
   * where for every i-th iteration, we collect the i-th ST that has
   * been emitted and preload the corresponding key.
   */

  public async simulateMultiRound(
    method: () => Promise<unknown>,
    contextInputs: RuntimeMethodExecutionData,
    parentStateService: AsyncStateService
  ): Promise<StateTransition<unknown>[]> {
    let numberMethodSTs: number | undefined;
    let collectedSTs = 0;

    const touchedKeys: string[] = [];

    let lastRuntimeResult: StateTransition<unknown>[];

    const preloadingStateService = new CachedStateService(parentStateService);

    /* eslint-disable no-await-in-loop */
    do {
      const stateTransitions = await this.executeMethodWithKeys(
        method,
        contextInputs,
        preloadingStateService
      );

      if (numberMethodSTs === undefined) {
        numberMethodSTs = stateTransitions.length;
      }

      if (collectedSTs === 0) {
        // Do a full run with all keys and see if keys have changed
        // (i.e. if no dynamic keys are used, just take that result)
        // If that is the case, fast-forward to the first dynamic key
        const keys = stateTransitions
          .map((st) => st.path.toString())
          .filter(distinctByString);
        const optimisticRunStateService = new CachedStateService(
          parentStateService
        );
        await optimisticRunStateService.preloadKeys(
          keys.map((fieldString) => Field(fieldString))
        );
        const stateTransitionsFullRun = await this.executeMethodWithKeys(
          method,
          contextInputs,
          optimisticRunStateService
        );

        const firstDiffIndex = _.zip(
          stateTransitions,
          stateTransitionsFullRun
        ).findIndex(
          ([st1, st2]) => st1?.path.toString() !== st2?.path.toString()
        );

        if (firstDiffIndex === -1) {
          // Abort bcs no dynamic keys are used => use then 1:1
          return stateTransitionsFullRun;
        }
        // here push all known keys up to the first dynamic key
        // touchedkeys is empty, so we don't care about that
        const additionalKeys = stateTransitionsFullRun
          .slice(0, firstDiffIndex)
          .map((st) => st.path.toString())
          .filter(distinctByString);

        // Preload eligible keys
        touchedKeys.push(...additionalKeys);

        await preloadingStateService.preloadKeys(
          additionalKeys.map((key) => Field(key))
        );

        collectedSTs = firstDiffIndex - 1;
        lastRuntimeResult = stateTransitions;
        // eslint-disable-next-line no-continue
        continue;
      }

      const latestST = stateTransitions.at(collectedSTs);

      if (
        latestST !== undefined &&
        !touchedKeys.includes(latestST.path.toString())
      ) {
        touchedKeys.push(latestST.path.toString());

        await preloadingStateService.preloadKey(latestST.path);
      }

      collectedSTs += 1;

      lastRuntimeResult = stateTransitions;
    } while (collectedSTs < numberMethodSTs);

    /* eslint-enable no-await-in-loop */

    return lastRuntimeResult;
  }
}
