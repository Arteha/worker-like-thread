import { WorkerException } from "./WorkerException";

export class WorkerExecutionException extends WorkerException
{
    constructor(message?: string)
    {
        super(message || "Execution fault.");
    }
}