import { BaseDTO } from "typed-dto";

export type DataTransferTypes = "string"
    | "boolean"
    | "number"
    | "date"
    | "buffer"
    | "null"
    | "undefined"
    | "void"
    | (new(...args: any[]) => BaseDTO);