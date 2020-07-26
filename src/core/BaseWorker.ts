import { ChildProcess } from "child_process";
import { TaskExecutionException } from "../exceptions/TaskExecutionException";
import { ValidationException } from "typed-dto/lib/exceptions/ValidationException";

type TaskHandler = {
    args: any[]
    resultType: any
    resolve: (...args: any[]) => any
    reject: (e: TaskExecutionException | ValidationException | Error) => any
}

export class BaseWorker
{
    private _lastTaskId: number = 0;
    private _process: ChildProcess | null = null;
    private _tasks: Record<string, TaskHandler> = {};

    constructor()
    {
        this._onMessage = this._onMessage.bind(this);
        this._onError = this._onError.bind(this);
        this._onExit = this._onExit.bind(this);
    }

    // Everything starts from here
    public run(): void
    {

    }

    public attachProcess(process: ChildProcess)
    {
        if(!this._process)
        {
            this._process = process;

            this._process.on("message", this._onMessage);
            this._process.once("error", this._onError);
            this._process.once("exit", this._onExit);
        }
    }

    protected _nextTaskId(): number
    {
        this._lastTaskId++;
        if(this._lastTaskId >= Number.MAX_SAFE_INTEGER)
            this._lastTaskId = 0;
        return this._lastTaskId;
    }

    private _onMessage(data: Buffer)
    {
        const taskId = Buffer.from([data[0], data[1], data[2], data[3]]).readInt32BE(0);
        const task: TaskHandler | null = this._tasks[taskId] || null;
        if(task)
        {
            delete this._tasks[taskId];

            const success = !!data[4];
            if(!success)
                task.reject(new TaskExecutionException(data.toString("utf8", 5, data.length)));
            else
            {
                if(task.resultType == "boolean")
                    task.resolve(!!data[5]);
                if(task.resultType == "buffer")
                    task.resolve(data.slice(5, data.length));
                else
                {
                    const str = data.toString("utf8", 5, data.length);
                    if(task.resultType == "string")
                        task.resolve(str);
                    else if(task.resultType == "number")
                        task.resolve(Number(str));
                    else if(task.resultType == "date")
                        task.resolve(new Date(str));
                    else if(task.resultType == "void")
                        task.resolve();
                    else
                    {
                        try
                        {
                            task.resolve(JSON.parse(str));
                        }
                        catch(e)
                        {
                            task.reject(e);
                        }
                    }
                }
            }
        }
        else
            console.warn(`Unknown worker task "${taskId}".`);
    }

    private _onError(err: Error)
    {
        if(!this._process)
            return;

        this._process.off("message", this._onMessage);
        this._process.off("exit", this._onExit);

        if(!this._process.killed)
            this._process.kill();

        const exception = new TaskExecutionException(err.toString());
        const tasks = this._tasks;
        this._tasks = {};
        for (const t in tasks)
            tasks[t].reject(exception);
    }

    private _onExit()
    {
        if(!this._process)
            return;

        this._process.off("message", this._onMessage);
        this._process.off("error", this._onError);

        const exception = new TaskExecutionException("Process exit during execution the task.");
        const tasks = this._tasks;
        this._tasks = {};
        for (const t in tasks)
            tasks[t].reject(exception);
    }
}