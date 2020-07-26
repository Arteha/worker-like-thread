import { WorkerExecutionException } from "../exceptions/WorkerExecutionException";
import { CrossProcessMessage } from "./WorkerLikeThread";

let WorkerClass: any = null;
let workerInstance: any = null;

function sendToMaster(message: CrossProcessMessage): any
{
    try
    {
        if(process.send)
            process.send(message);
    }
    catch(e)
    {

    }
}

process.on("message", async function(message: CrossProcessMessage)
{
    if(message.type == "run")
    {
        const requiredModule = require(message.data.filePath);
        WorkerClass = requiredModule[message.data.className];

        if(!WorkerClass)
            throw new WorkerExecutionException(`Failed to import worker class "${
                message.data.className
            }" from: "${
                JSON.stringify(message.data.filePath)
            }".`);

        workerInstance = new WorkerClass(...message.data.args);
        workerInstance.run();

        sendToMaster({type: "started", data: null});
    }
    else if(message.type == "execute-function")
    {
        try
        {
            const result = await workerInstance[message.data.key](...message.data.args);
            sendToMaster({
                type: "function-execution-result",
                data: {
                    taskId: message.data.taskId,
                    value: result
                }
            });
        }
        catch(e)
        {
            sendToMaster({
                type: "function-execution-error",
                data: {
                    taskId: message.data.taskId,
                    error: {
                        message: e.message,
                        stack: e.stack
                    }
                }
            });
        }
    }
});

sendToMaster({type: "online", data: null});