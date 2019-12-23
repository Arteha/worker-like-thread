export class WorkerException extends Error
{
    constructor(message: string)
    {
        super(message);
    }
}