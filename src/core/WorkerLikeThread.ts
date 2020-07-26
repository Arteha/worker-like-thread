import { ChildProcess, fork } from "child_process";
import { join } from "path";
import { EventEmitter } from "events";
import { IRunnable } from "../interfaces/IRunnable";

export type Message<T, D> = {
    type: T
    data: D
}

export type MessageRun = Message<"run", {
    filePath: string
    args: any[]
}>;
export type MessageExecuteFunction = Message<"execute-function", {
    executionId: string | number
    key: string
    args: any[]
}>;
export type MessageExecuteGet = Message<"execute-get", {
    executionId: string | number
    key: string
}>;
export type MessageExecuteSet = Message<"execute-set", {
    executionId: string | number
    key: string
    value: any
}>;
export type MessageToWorker =
    MessageRun
    | MessageExecuteFunction
    | MessageExecuteGet
    | MessageExecuteSet;

export type MessageOnline = Message<"online", null>;
export type MessageStarted = Message<"started", null>;
export type MessageExecutionResultFunction = Message<"execution-result-function", {
    executionId: string | number
    value: any
}>;
export type MessageExecutionErrorFunction = Message<"execution-error-function", {
    executionId: string | number
    error: string
}>;
export type MessageExecutionResultSet = Message<"execution-result-set", {
    executionId: string | number
    value: any
}>;
export type MessageExecutionErrorSet = Message<"execution-error-set", {
    executionId: string | number
    error: string
}>;
export type MessageExecutionResultGet = Message<"execution-result-get", {
    executionId: string | number
    value: any
}>;
export type MessageExecutionErrorGet = Message<"execution-error-get", {
    executionId: string | number
    error: string
}>;
export type MessageEmitEvent = Message<"emit-event", {
    args: any[]
}>;
export type MessageToMaster =
    MessageOnline
    | MessageStarted
    | MessageExecutionResultFunction
    | MessageExecutionErrorFunction
    | MessageExecutionResultSet
    | MessageExecutionErrorSet
    | MessageExecutionResultGet
    | MessageExecutionErrorGet
    | MessageEmitEvent;

export type CrossProcessMessage = MessageToWorker | MessageToMaster;

export class WorkerLikeThread extends EventEmitter implements IRunnable
{
    private childClassFilePath: string;
    private worker: ChildProcess | null = null;
    private executionIndex: number = 0;
    private _args: IArguments;
    private _emit;

    /**
     * @Description Don't forget to pass your args to super.
     * */
    constructor(args: IArguments)
    {
        super();
        this._args = args;
        this._emit = this.emit.bind(this);

        this.handleMessage = this.handleMessage.bind(this);

        if(["YES", "Y"].includes(`${process.env.IS_WORKER_LIKE_THREAD}`))
        {
            const caller = this._getCaller();
            if(!caller)
                throw new Error("Failed to get child class.");
            this.childClassFilePath = caller;
        }
        else
        {
            const self = this;
            this.emit = function(event: string | symbol, ...args: any): boolean
            {
                self.sendToMaster({
                    type: "emit-event",
                    data: {
                        args: [...arguments]
                    }
                });
                return self._emit(...arguments);
            };
        }
    }

    /**
     * @description Will be executed in child process on start.
     * */
    public run(): void
    {

    }

    /**
     * @description Execute this class in the child_process and provide magic
     * */
    public async execute(): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            const self = this;
            const that: any = this;
            const keys: Array<string> = Object.keys(that).concat(Object.getOwnPropertyNames(that.__proto__));
            keys.push("emit");
            for (let n of keys)
            {
                if(
                    [
                        "constructor",
                        "handleMessage",
                        "_warnForObjects",
                        "run",
                        "_emit",
                        "childClassFilePath",
                        "executionIndex",
                        "worker",
                        "_args",
                        ...Object.keys(EventEmitter.prototype)
                    ].indexOf(n) > -1 &&
                    [
                        "emit"
                    ].indexOf(n) == -1
                )
                    continue;

                if(typeof that[n] == "function")
                {
                    that[n] = async function()
                    {
                        let args: any = arguments;
                        let warn: boolean = false;
                        for (let v of args)
                        {
                            warn = self._warnForObjects(v);
                            if(warn)
                                break;
                        }
                        const result = await self._executeFunction(n, args);
                        if(!warn)
                            self._warnForObjects(result);
                        return result;
                    };
                }
                else
                {
                    Object.defineProperty(that, n, {
                        get: async function()
                        {
                            // Get data from another worker
                            const result = await self._executeGet(n);
                            self._warnForObjects(result);
                            return result;
                        },
                        set: async function(value)
                        {
                            self._warnForObjects(value);
                            await self._executeSet(n, value);
                            return value;
                        }
                    });
                }
            }
            this.worker = fork(join(__dirname, "/worker"), [], {
                env: {
                    NODE_ENV: process.env.NODE_ENV
                }
            });

            function handler(message: CrossProcessMessage)
            {
                if(message.type == "online")
                {
                    self.sendToWorker({
                        type: "run",
                        data: {
                            filePath: self.childClassFilePath,
                            args: [...self._args]
                        }
                    });
                }
                else if(message.type == "started")
                {
                    self.worker ? self.worker.off("message", handler) : null;
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

    public sendToMaster(message: CrossProcessMessage): void
    {
        if(process.send)
            process.send(message);
    }

    public sendToWorker(message: CrossProcessMessage): void
    {
        if(this.worker && !this.worker.killed)
            this.worker.send(message);
    }

    private handleMessage(message: CrossProcessMessage): void
    {
        if(message.type == "emit-event")
            this._emit(...message.data.args);
    }

    private generateExecutionId(): number
    {
        return this.executionIndex++;
    }

    private _executeFunction(key: string, args: any[]): Promise<any>
    {
        const self = this;
        const executionId = this.generateExecutionId();
        return new Promise<any>((resolve, reject) =>
        {
            if(this.worker)
            {
                this.sendToWorker({
                    type: "execute-function",
                    data: {
                        executionId: executionId,
                        key: key,
                        args: [...args]
                    }
                });

                function handler(message: CrossProcessMessage)
                {
                    if(message.type == "execution-result-function")
                    {
                        if(message.data.executionId == executionId)
                        {
                            self.worker ? self.worker.off("message", handler) : null;
                            resolve(message.data.value);
                        }
                    }
                    else if(message.type == "execution-error-function")
                    {
                        if(message.data.executionId == executionId)
                        {
                            self.worker ? self.worker.off("message", handler) : null;
                            reject(message.data.error);
                        }
                    }
                }

                this.worker.on("message", handler);
            }
        });
    }

    private async _executeGet(key: string)
    {
        const self = this;
        const executionId = this.generateExecutionId();
        return new Promise<any>((resolve, reject) =>
        {
            if(this.worker)
            {
                this.sendToWorker({
                    type: "execute-get",
                    data: {
                        executionId: executionId,
                        key: key
                    }
                });

                function handler(message: CrossProcessMessage)
                {
                    if(message.type == "execution-result-get")
                    {
                        if(message.data.executionId == executionId)
                        {
                            self.worker ? self.worker.off("message", handler) : null;
                            resolve(message.data.value);
                        }
                    }
                    else if(message.type == "execution-error-get")
                    {
                        if(message.data.executionId == executionId)
                        {
                            self.worker ? self.worker.off("message", handler) : null;
                            reject(message.data.error);
                        }
                    }
                }

                this.worker.on("message", handler);
            }
        });
    }

    private async _executeSet(key: string, value: any)
    {
        const self = this;
        const executionId = this.generateExecutionId();
        return new Promise<any>((resolve, reject) =>
        {
            if(this.worker)
            {
                this.sendToWorker({
                    type: "execute-set",
                    data: {
                        executionId: executionId,
                        key: key,
                        value: value
                    }
                });

                function handler(message: CrossProcessMessage)
                {
                    if(message.type == "execution-result-set")
                    {
                        if(message.data.executionId == executionId)
                        {
                            self.worker ? self.worker.off("message", handler) : null;
                            resolve(message.data.value);
                        }
                    }
                    else if(message.type == "execution-error-set")
                    {
                        if(message.data.executionId == executionId)
                        {
                            self.worker ? self.worker.off("message", handler) : null;
                            reject(message.data.error);
                        }
                    }
                }

                this.worker.on("message", handler);
            }
        });
    }

    private _getCaller()
    {
        try
        {
            var err: any = new Error();
            var callerfile;
            var currentfile;

            Error.prepareStackTrace = function(err, stack)
            {
                return stack;
            };

            currentfile = err.stack.shift().getFileName();

            while(err.stack.length)
            {
                callerfile = err.stack.shift().getFileName();

                if(currentfile !== callerfile) return callerfile;
            }
        }
        catch(err)
        {
        }
        return undefined;
    }

    private _warnForObjects(val: any): boolean
    {
        if(val && val instanceof Object && process.env.NODE_ENV != "production")
        {
            console.warn("Warning! Objects are copies, not references.");
            return true;
        }
        return false;
    }
}