import { SmartContract } from "o1js";
import { TypedClass } from "@proto-kit/common";

import { GetContracts } from "../../src/settlement/modularity/types";
import {
  BridgeContractType,
  MandatorySettlementModulesRecord,
  SettlementContractType,
} from "../../src";
/* eslint-disable @typescript-eslint/no-unused-vars */

// Goal of this "test" is that it compiles. By compiling this file checks that
// certain types are inferred correctly

type Inferred = GetContracts<MandatorySettlementModulesRecord>;

// Get inferred Bridge Type
type Bridge = Inferred["BridgeContract"];
// Get inferred Settlement Contract Type
type Settlement = Inferred["SettlementContract"];

// Check that the Bridge type is of the correct type
const bridgeSuccessful: Bridge extends TypedClass<
  SmartContract & BridgeContractType
>
  ? true
  : false = true;

const settlementSuccessful: Settlement extends TypedClass<
  SmartContract & SettlementContractType
>
  ? true
  : false = true;

/* eslint-enable @typescript-eslint/no-unused-vars */
