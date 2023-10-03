import { ChildContainerProvider } from "./ChildContainerProvider";

export interface ChildContainerStartable {
  create: (childContainerProvider: ChildContainerProvider) => void;
}