export type Primitive = string | number | boolean | null | undefined | Date;
/** Operator types bound to the field's value type */
export type ExistsOperator = {
    $exists: boolean;
};
export type RangeOperator<T> = {
    $gte?: T extends number | Date ? T : never;
    $lte?: T extends number | Date ? T : never;
};
export type InOperator<T> = {
    $in: readonly T[];
};
export type RegexOperator = {
    $regex: string | RegExp;
};
/** A single-field condition for use inside $or */
export type SingleFieldCondition<T> = {
    [K in keyof T]?: Condition<T[K]>;
};
/** Condition allowed on a field's value */
export type Condition<V> = V | (V extends string ? RegexOperator : never) | (V extends Primitive ? ExistsOperator : never) | (V extends number | Date ? RangeOperator<V> : never) | InOperator<V>;
/** Filter shape: field-wise conditions, plus an optional $or */
export type Filter<T> = {
    [K in keyof T]?: Condition<T[K]>;
} & {
    $or?: SingleFieldCondition<T>[];
};
/** Sort direction for sorting  and Sort Spec for parsing e.g. {name:-1}*/
export type SortDirection = 1 | -1;
export type SortSpec<T> = Partial<Record<keyof T, SortDirection>>;
/** For parsing projection {name: 1} */
export type Projection<T> = Partial<Record<keyof T, 0 | 1>>;
