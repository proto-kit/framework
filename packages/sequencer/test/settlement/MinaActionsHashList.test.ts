import "reflect-metadata";
import {
  ACTIONS_EMPTY_HASH,
  MinaActions,
  MinaActionsHashList,
} from "@proto-kit/protocol";
import { Field } from "o1js";

describe("MinaActionHashList", () => {
  it("manual case", () => {
    const list = new MinaActionsHashList(ACTIONS_EMPTY_HASH);

    const actionsHash = MinaActions.actionHash(
      [
        "14132709777779420149721020561814721463845506339987178711779066004916738489952",
        "4600",
        "1",
        "0",
        "15945844446374866669432419053074147430762382289333280994407800492808129069306",
      ].map(Field)
    );

    list.push(actionsHash);

    expect(list.commitment.toString()).toStrictEqual(
      "20845285689349782375201754441817575492805341493102687221063085782440686084139"
    );
  });
});
