import { ChildContainerProvider } from "./ChildContainerProvider";

export interface ChildContainerCreatable {
  create: (childContainerProvider: ChildContainerProvider) => void;
}
