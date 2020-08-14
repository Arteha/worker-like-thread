import { ChildProcess, fork } from "child_process";
import { join } from "path";
import { EventEmitter } from "events";
import { REMOTE_PROPERTIES_SYMBOL } from "../symbols/REMOTE_PROPERTIES_SYMBOL";
import { WORKER_SETTINGS_SYMBOL } from "../symbols/WORKER_SETTINGS_SYMBOL";
import { WorkerSpawnSettings } from "../types/worker.spawn.settings";
import { WorkerExecutionException } from "../exceptions/WorkerExecutionException";
import { TaskExecutionException } from "../exceptions/TaskExecutionException";
import { RemoteProperties } from "../types/remote.properties";


export type Message<T, D> = {
    type: T
    data: D
}

export type MessageRun = Message<"construct", {
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

export class Threadlike extends EventEmitter
{
    private worker: ChildProcess | null = null;
    private executionIndex: number = 0;
    private inMasterProcess: boolean = false;

    constructor()
    {
        super();

        this.handleMessage = this.handleMessage.bind(this);
    }

    public emit(event: string | symbol, ...args: any[]): boolean
    {
        if (!this.inMasterProcess)
        {
            this.sendToMaster({
                type: "emit-event",
                data: {
                    args: [event, ...args]
                }
            });
            return super.emit(event, ...args);
        }
        else
            return super.emit(event, ...args);
    }

    /**
     * @description Execute this class in the child_process and provide magic
     * */
    public async spawn(): Promise<void>
    {
        if (this.inMasterProcess)
            throw new WorkerExecutionException("Worker has been executed.");

        this.inMasterProcess = true;

        return new Promise<void>((resolve, reject) =>
        {
            const settings: WorkerSpawnSettings | undefined = Reflect.getMetadata(WORKER_SETTINGS_SYMBOL, this);
            if (!settings)
                throw new WorkerExecutionException("Execution fault. Probably you forgot to place @Worker(...) decorator.");

            const self: any = this;
            const keys: RemoteProperties | undefined = Reflect.getMetadata(REMOTE_PROPERTIES_SYMBOL, this);

            for (let n in keys)
            {
                if (typeof self[n] == "function")
                    self[n] = async (...args: any[]) => await this._executeFunction(n, args);
                else
                    throw new WorkerExecutionException(`Only functions can been executed remotely. Property "${n}" is not a function.`);
            }
            self.emit = async (...args: any[]) => await this._executeFunction("emit", args);

            this.worker = fork(join(__dirname, "/worker"), [], {
                env: {...process.env}
            });

            const handler = (message: CrossProcessMessage) =>
            {
                if (message.type == "online")
                {
                    this.sendToWorker({
                        type: "construct",
                        data: {
                            filePath: settings!.filePath,
                            className: settings!.className,
                            args: settings!.args
                        }
                    });
                }
                else if (message.type == "started")
                {
                    if (this.worker)
                        this.worker.off("message", handler);
                    resolve();
                }
            }

            this.worker.on("message", handler);
            this.worker.on("message", this.handleMessage);
            this.worker.once("exit", () => this.worker ? this.worker.removeAllListeners() : null);
        });
    }

    public terminate(): void
    {
        if (this.worker)
        {
            this.worker.removeAllListeners();
            this.worker.kill();
        }
    }

    private sendToMaster(message: CrossProcessMessage): void
    {
        if (process.send)
            process.send(message);
    }

    private sendToWorker(message: CrossProcessMessage): void
    {
        if (this.worker)
        {
            if (!this.worker.killed)
                this.worker.send(message);
        }
    }

    private handleMessage(msg: CrossProcessMessage): void
    {
        if (msg.type == "emit-event")
            (super.emit as any)(...msg.data.args);
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
            if (this.worker)
            {
                if(this.worker.killed)
                {
                    reject(new TaskExecutionException("Worker had been terminated."));
                    return;
                }

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
                    if (message.type == "function-execution-result")
                    {
                        if (message.data.taskId == taskId)
                        {
                            if (self.worker)
                                self.worker.off("message", handler);

                            resolve(message.data.value);
                        }
                    }
                    else if (message.type == "function-execution-error")
                    {
                        if (message.data.taskId == taskId)
                        {
                            if (self.worker)
                                self.worker.off("message", handler);

                            const err = new TaskExecutionException(message.data.error.message);
                            err.stack = message.data.error.stack;
                            reject(err);
                        }
                    }
                }

                this.worker.on("message", handler);
            }
            else
                reject(new TaskExecutionException("Missing worker."));
        });
    }
}