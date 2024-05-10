import { Field, Bool } from "o1js";
import {
  OpcodeDefinitions,
  ProxyInstructions,
} from "../types";
import { genericProxyWithThis } from "./helpers";

export const FieldInstructions = {
  "Field.add": [Field, Field, Field],
  "Field.mul": [Field, Field, Field],
  "Field.sub": [Field, Field, Field],
  "Field.equals": [Field, Field, Bool],
  "Field.neg": [Field, Field],
} satisfies OpcodeDefinitions;

export const FieldProxies = {
  "Field.add": {
    proxyFunction: (contextF) => {
      Field.prototype.add = genericProxyWithThis(
        Field.prototype.add,
        "Field.add",
        contextF
      );
    },
    execute: (thisArg: Field, arg: Field) => thisArg.add(arg),
  },
  "Field.equals": {
    proxyFunction: (contextF) => {
      Field.prototype.equals = genericProxyWithThis(
        Field.prototype.equals,
        "Field.equals",
        contextF
      );
    },
    execute: (thisArg: Field, arg: Field) => thisArg.equals(arg),
  },
  "Field.mul": {
    proxyFunction: (contextF) => {
      Field.prototype.mul = genericProxyWithThis(
        Field.prototype.mul,
        "Field.mul",
        contextF
      );
    },
    execute: (thisArg: Field, arg: Field) => thisArg.mul(arg),
  },
  "Field.sub": {
    proxyFunction: (contextF) => {
      Field.prototype.sub = genericProxyWithThis(
        Field.prototype.sub,
        "Field.sub",
        contextF
      );
    },
    execute: (thisArg: Field, arg: Field) => thisArg.mul(arg),
  },
  "Field.neg": {
    proxyFunction: (contextF) => {
      Field.prototype.neg = genericProxyWithThis(
        Field.prototype.neg,
        "Field.neg",
        contextF
      )
    },
    execute: (thisArg: Field) => thisArg.neg(),
  },
} satisfies ProxyInstructions<typeof FieldInstructions>;
