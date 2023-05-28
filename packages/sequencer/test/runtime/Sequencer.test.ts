import { Sequencer } from "../../src/runtime/executor/Sequencer";
import { DummySequencerModule } from "./DummySequencerModule";

describe("sequencer", () => {

  it("should configure Dummy module correctly", async () => {

    const sequencer = Sequencer.from({
      dummy1: DummySequencerModule,
    });

    sequencer.config({

    })

  })

  it("should configure multiple Dummy module correctly", async () => {

  })

  it("should execute endpoint function correctly", async () => {

  })

})