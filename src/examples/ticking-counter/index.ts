import { TicksCounter } from "./TicksCounter";
import { join } from "path";

(async() =>
{
    /*console.log("Running worker...");
    const worker: TicksCounter = await Executor.run(
        join(process.cwd(), "lib/examples/ticking-counter/TickingCounter.js"),
        TicksCounter
    );
    console.log("Worker successfully started.");

    setInterval(async() =>
    {
        console.log("Executing remote task:");
        try
        {
            console.log(await worker.getTicks());
            console.log(await worker.getAllInfo({timestamp: new Date()}));
        }
        catch(e)
        {
            console.error(e);
        }
    }, 2000);*/
})().catch(e => [console.error(0), process.exit(1)]);