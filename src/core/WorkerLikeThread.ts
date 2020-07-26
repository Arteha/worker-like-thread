import { ChildProcess, fork } from "child_process";
import { join } from "path";
import { EventEmitter } from "events";
import { REMOTE_ACCESS_SYMBOL } from "../symbols/REMOTE_ACCESS_SYMBOL";
import { WORKER_SETTINGS_SYMBOL } from "../symbols/WORKER_SETTINGS_SYMBOL";
import { WorkerSettingsWithClassName } from "../types/worker.settings.with.class.name";
import { WorkerExecutionException } from "../exceptions/WorkerExecutionException";
import { TaskExecutionException } from "../exceptions/TaskExecutionException";

export type Message<T, D> = {
    type: T
    data: D
}

export type MessageRun = Message<"run", {
    filePath: string
    className: string
    args: any[]
}>;
export type MessageExecuteFunction = Message<"execute-function", {
    taskId: string | number
    key: string
    args: any[]
}>;
export type MessageToWorker = MessageRun | MessageExecuteFunction;

export type MessageOnline = Message<"online", null>;
export type MessageStarted = Message<"started", null>;
export type MessageExecutionResultFunction = Message<"function-execution-result", {
    taskId: string | number
    value: any
}>;
export type MessageFunctionExecutionError = Message<"function-execution-error", {
    taskId: string | number
    error: {
        message: string
        stack: string
    }
}>;
export type MessageEmitEvent = Message<"emit-event", {
    args: any[]
}>;
export type MessageToMaster =
    MessageOnline
    | MessageStarted
    | MessageExecutionResultFunction
    | MessageFunctionExecutionError
    | MessageEmitEvent;

export type CrossProcessMessage = MessageToWorker | MessageToMaster;

export class WorkerLikeThread extends EventEmitter
{
    private worker: ChildProcess | null = null;
    private executionIndex: number = 0;
    private _args: any[];
    private _emit;

    /**
     * @Description Don't forget to pass your args to super.
     * */
    constructor(...args: any[])
    {
        super();
        this._args = args;
        this._emit = this.emit.bind(this);

        this.handleMessage = this.handleMessage.bind(this);
    }

    public emit(event: string | symbol, ...args: any[]): boolean
    {
        if(["YES", "Y"].includes(`${process.env.WORKER_LIKE_THREAD}`))
        {
            this.sendToMaster({
                    type: "emit-event",
                    data: {
                        args: [...args]
                    }
                });
                return this._emit(...args);
        }
        else
            return super.emit(event, ...args);
    }

    /**
     * @description Will be executed in child process on start.
     * */
    protected run(): void
    {

    }

    /**
     * @description Execute this class in the child_process and provide magic
     * */
    public async execute(): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            const settings: WorkerSettingsWithClassName | undefined = Reflect.getMetadata(WORKER_SETTINGS_SYMBOL, this);
            if(settings)
                throw new WorkerExecutionException("Execution fault. Probably you forgot to place @Worker(...) decorator.");

            const self = this;
            const that: any = this;
            const keys: Array<string> = Object.keys(this as any).concat(Object.getOwnPropertyNames(that.__proto__));

            for (let n of keys)
            {
                if(Reflect.getMetadata(REMOTE_ACCESS_SYMBOL, self))
                {
                    if(typeof that[n] == "function")
                        that[n] = async (...args: any[]) => await self._executeFunction(n, args);
                }
            }
            that.emit = async (...args: any[]) => await self._executeFunction("emit", args);

            this.worker = fork(join(__dirname, "/worker"), [], {
                env: {...process.env}
            });

            function handler(message: CrossProcessMessage)
            {
                if(message.type == "online")
                {
                    self.sendToWorker({
                        type: "run",
                        data: {
                            filePath: settings!.filePath,
                            className: settings!.className,
                            args: [...self._args]
                        }
                    });
                }
                else if(message.type == "started")
                {
                    if(self.worker)
                        self.worker.off("message", handler);
                    resolve();
                }
            }

            this.worker.on("message", handler);
            this.worker.once("exit", () => this.worker ? this.worker.removeAllListeners() : null);
        });
    }

    public terminate(): void
    {
        if(this.worker)
        {
            this.worker.removeAllListeners();
            if(!this.worker.killed)
                this.worker.kill();
        }
    }

    private sendToMaster(message: CrossProcessMessage): void
    {
        if(process.send)
            process.send(message);
    }

    private sendToWorker(message: CrossProcessMessage): void
    {
        if(this.worker && !this.worker.killed)
            this.worker.send(message);
    }

    private handleMessage(message: CrossProcessMessage): void
    {
        if(message.type == "emit-event")
            this._emit(...message.data.args);
    }

    private generateTaskId(): number
    {
        return this.executionIndex++;
    }

    private _executeFunction(key: string, args: any[]): Promise<any>
    {
        const self = this;
        const taskId = this.generateTaskId();
        return new Promise<any>((resolve, reject) =>
        {
            if(this.worker)
            {
                this.sendToWorker({
                    type: "execute-function",
                    data: {
                        taskId: taskId,
                        key: key,
                        args: [...args]
                    }
                });

                function handler(message: CrossProcessMessage)
                {
                    if(message.type == "function-execution-result")
                    {
                        if(message.data.taskId == taskId)
                        {
                            if(self.worker)
                                self.worker.off("message", handler);

                            resolve(message.data.value);
                        }
                    }
                    else if(message.type == "function-execution-error")
                    {
                        if(message.data.taskId == taskId)
                        {
                            if(self.worker)
                                self.worker.off("message", handler);

                            const err = new TaskExecutionException(message.data.error.message);
                            err.stack = message.data.error.stack;
                            reject(err);
                        }
                    }
                }

                this.worker.on("message", handler);
            }
        });
    }
}