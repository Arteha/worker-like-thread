import { WorkerException } from "./WorkerException";

export class TaskExecutionException extends WorkerException
{
    constructor(message?: string)
    {
        super(message || "Task execution fault.");
    }
}