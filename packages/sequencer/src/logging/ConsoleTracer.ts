import { injectable } from "tsyringe";
import { log } from "@proto-kit/common";
import { AsciiTable3 } from "ascii-table3";
// eslint-disable-next-line import/no-extraneous-dependencies
import sortBy from "lodash/sortBy";

import { closeable } from "../sequencer/builder/Closeable";

import { Tracer } from "./Tracer";

type StoreType = Record<string, { duration: number }[]>;

@injectable()
@closeable()
export class ConsoleTracer implements Tracer {
  // Hard-code this for the moment. Needs to be configured.
  timeInterval: number = 8000;

  store: StoreType = {};

  type: "interval" | "manual" = "interval";

  public enableManualOutputs() {
    this.type = "manual";
    this.clearInterval();
  }

  intervalId: NodeJS.Timeout | undefined = undefined;

  public getTraces() {
    return this.store;
  }

  public clearTraces() {
    this.store = {};
  }

  public printSummary() {
    const { store } = this;
    const traceNames = Object.keys(store);

    // We checked the record to see if any methods have exceeded the configured interval.
    // If so we print them and then delete from the record.
    // We look at the first element in the array only (i.e. the first invocation of the function)
    // as this should be enough.
    const rows = traceNames.map((traceName) => {
      const sumTime = store[traceName].reduce((result, curr) => {
        return result + curr.duration;
      }, 0);
      const numberOfCalls = store[traceName].length;
      const avg = (sumTime / numberOfCalls).toFixed(2);
      return [traceName, numberOfCalls, avg, sumTime.toFixed(0)];
    });

    const sortedRows = sortBy(rows, ([name]) => name);

    const table = new AsciiTable3()
      .setHeading("Trace", "# calls", "avg", "sum")
      .setAlignLeft(1)
      .setAlignRight(2)
      .setAlignRight(3)
      .setAlignRight(4)
      .setStyle("compact")
      .addRowMatrix(sortedRows);

    log.debug(table.toString());

    this.clearTraces();
  }

  public async trace<T>(
    name: string,
    f: () => Promise<T>,
    metadata?: Record<string, string | number | boolean>
  ): Promise<T> {
    if (this.intervalId === undefined && this.type === "interval") {
      this.intervalId = setInterval(
        () => this.printSummary(),
        this.timeInterval
      );
    }

    const startTime = Date.now();
    const result = await f();
    const duration = Date.now() - startTime;

    if (name in this.store) {
      this.store[name].push({ duration });
    } else {
      this.store[name] = [{ duration }];
    }
    return result;
  }

  private clearInterval() {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
    }
  }

  public async close() {
    this.clearInterval();
  }
}
