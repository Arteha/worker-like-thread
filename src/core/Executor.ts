import { BaseWorker } from "./BaseWorker";
import { MASTER_SYMBOL } from "../symbols/MASTER_SYMBOL";
import { fork } from "child_process";
import { WorkerExecutionException } from "../exceptions/WorkerExecutionException";

export class Executor
{
    public static run<T extends BaseWorker>(filePath: string, _Worker: (new(...args: any[]) => T)): Promise<T>
    {
        return new Promise<T>((resolve, reject) =>
        {
            Reflect.defineMetadata(MASTER_SYMBOL, true, _Worker);
            const worker = new _Worker();
            const childProcess = fork(filePath);
            let timeout: any;

            function onMessage(data: Buffer)
            {
                clearTimeout(timeout);
                childProcess.off("error", onError);
                childProcess.off("exit", onExit);

                if(data.toString() == "online")
                {
                    worker.attachProcess(childProcess);
                    resolve(worker);
                }
                else
                {
                    childProcess.kill();
                    reject(new WorkerExecutionException("Process didn't respond correctly."));
                }
            }

            function onError(err: Error)
            {
                clearTimeout(timeout);
                childProcess.off("message", onMessage);
                childProcess.off("exit", onExit);

                if(!childProcess.killed)
                    childProcess.kill();

                reject(new WorkerExecutionException(err.toString()));
            }

            function onExit(code: number | null)
            {
                clearTimeout(timeout);
                childProcess.off("message", onMessage);
                childProcess.off("error", onError);

                reject(new WorkerExecutionException(`Process exit with code: ${code}.`));
            }

            function onTimeout()
            {
                childProcess.off("message", onMessage);
                childProcess.off("error", onError);
                childProcess.off("exit", onExit);

                if(!childProcess.killed)
                    childProcess.kill();

                reject(new WorkerExecutionException(`Worker execution timeout.`));
            }

            childProcess.once("message", onMessage);
            childProcess.once("error", onError);
            childProcess.once("exit", onExit);
            timeout = setTimeout(onTimeout, 2 * 60 * 1000);
        })
    }
}