process.env.IS_WORKER_LIKE_THREAD = "YES";
import { CrossProcessMessage, WorkerLikeThread } from "./WorkerLikeThread";

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
        let requiredModule = require(message.data.filePath);
        for (let n in requiredModule)
        {
            if(Object.getPrototypeOf(requiredModule[n]) == WorkerLikeThread)
            {
                WorkerClass = requiredModule[n];
                break;
            }
        }
        if(!WorkerClass)
            throw new Error("Failed to import your worker class.");
        workerInstance = new WorkerClass(...message.data.args);
        if(workerInstance)
            await workerInstance.run();

        sendToMaster({
            type: "started",
            data: null
        });
    }
    else if(message.type == "execute-function")
    {
        try
        {
            const result = await workerInstance[message.data.key](...message.data.args);
            sendToMaster({
                type: "execution-result-function",
                data: {
                    executionId: message.data.executionId,
                    value: result
                }
            });
        }
        catch(e)
        {
            sendToMaster({
                type: "execution-error-function",
                data: {
                    executionId: message.data.executionId,
                    error: e.stack
                }
            });
        }
    }
    else if(message.type == "execute-get")
    {
        try
        {
            const result = await workerInstance[message.data.key];
            sendToMaster({
                type: "execution-result-get",
                data: {
                    executionId: message.data.executionId,
                    value: result
                }
            });
        }
        catch(e)
        {
            sendToMaster({
                type: "execution-error-get",
                data: {
                    executionId: message.data.executionId,
                    error: e.stack
                }
            });
        }
    }
    else if(message.type == "execute-set")
    {
        try
        {
            workerInstance[message.data.key] = message.data.value;
            const result = await workerInstance[message.data.key];
            sendToMaster({
                type: "execution-result-set",
                data: {
                    executionId: message.data.executionId,
                    value: result
                }
            });
        }
        catch(e)
        {
            sendToMaster({
                type: "execution-error-set",
                data: {
                    executionId: message.data.executionId,
                    error: e.stack
                }
            });
        }
    }
});

sendToMaster({
    type: "online",
    data: null
});