import {ClassType} from "../Utils.js";

export interface GraphqlModule<T extends ClassType & Function> {

    resolverType: T

}