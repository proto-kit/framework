/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
/* eslint-disable import/prefer-default-export */
import {Bool, Circuit, Field, FlexibleProvablePure, Poseidon, Struct} from 'snarkyjs';

export class ProvableOption extends Struct({
    isSome: Bool,
    value: Field,
}) {}

// TODO Only placeholder until feature/module is merged
export class ProvableStateTransition extends Struct({
    path: Field,

    // must be applied even if `None`
    from: ProvableOption,

    // must be ignored if `None`
    to: ProvableOption,
}) {
    public static from(path: Field, from: ProvableOption) {
        return new ProvableStateTransition({
            path,
            from,
            to: Option.none().toProvable(),
        });
    }

    public static fromTo(path: Field, from: ProvableOption, to: ProvableOption) {
        return new ProvableStateTransition({
            path,
            from,
            to,
        });
    }

    public hash() : Field {
        return Field(0)
    }

    //TODO ---------------------
    //TODO ADD
    public static dummy() : ProvableStateTransition {
        return ProvableStateTransition.from(Field(0), Option.none().toProvable())
    }
}

export class Option<Value> {
    public static from<Value>(
        isSome: Bool,
        value: Value,
        valueType: FlexibleProvablePure<Value>
    ) {
        return new Option(isSome, value, valueType);
    }

    public static value<Value>(value: Value,
                        valueType: FlexibleProvablePure<Value>){
        return Option.from(Bool(true), value, valueType)
    }

    public static none() {
        return new Option(Bool(false), Field(0), Field);
    }

    public constructor(
        public isSome: Bool,
        public value: Value,
        public valueType: FlexibleProvablePure<Value>
    ) {}

    public get treeValue() {
        const treeValue = Poseidon.hash(this.valueType.toFields(this.value));

        // if the sequencer claims the value is `None`,
        // then we use Field(0) as the treeValue so it can be proven later
        return Circuit.if(this.isSome, treeValue, Field(0));
    }

    public toProvable() {
        return new ProvableOption({
            isSome: this.isSome,
            value: this.treeValue,
        });
    }
}