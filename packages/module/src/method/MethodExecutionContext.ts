/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable max-classes-per-file */
/* eslint-disable import/no-unused-modules */
/* eslint-disable new-cap */
import { Bool } from 'snarkyjs';
import { singleton } from 'tsyringe';
import { ProvableStateTransition } from '../stateTransition/StateTransition';
import log from 'loglevel';

export class MethodExecutionResult<ResultValue> {
  public stateTransitions: ProvableStateTransition[] = [];

  public status: Bool = Bool(true);

  public value?: ResultValue;
}

@singleton()
export class MethodExecutionContext<ResultValue> {
  public result: MethodExecutionResult<ResultValue> =
    new MethodExecutionResult();

  public methods: string[] = [];

  public addStateTransition(stateTransition: ProvableStateTransition) {
    this.result.stateTransitions.push(stateTransition);
  }

  public setStatus(status: Bool) {
    this.result.status = status;
  }

  public beforeMethod(methodName: string) {
    if (this.isFinished) {
      this.result = new MethodExecutionResult();
    }
    this.methods.push(methodName);
  }

  public afterMethod() {
    this.methods.pop();
  }

  public get isFinished() {
    return this.methods.length === 0;
  }

  public current() {
    return {
      isFinished: this.isFinished,
      result: this.result,
    };
  }
}
