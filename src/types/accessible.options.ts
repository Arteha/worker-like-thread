import { DataTransferTypes } from "./data.transfer.types";

export type AccessibleOptions = {
    args?: DataTransferTypes | DataTransferTypes[]
    result?: DataTransferTypes | DataTransferTypes[]
} | DataTransferTypes | DataTransferTypes[];