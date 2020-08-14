import { TicksCounter } from "./TicksCounter";
import { InfoDTO } from "./dto/InfoDTO";
import { sleep } from "./utils/sleep";


(async () =>
{
    console.log("Running worker...");
    const worker = new TicksCounter();
    await worker.spawn();
    console.log("Worker successfully started.");

    worker.on("pong", async (count: number) =>
    {
        console.log("pong:", ++count);
        await sleep(1000);
        worker.emit("ping", count);
    });

    worker.emit("ping", 0);

    setInterval(async () =>
    {
        try
        {
            const ticks = await worker.getTicks();
            console.log({ticks});

            const info = InfoDTO.createOrFail(await worker.getAllInfo({timestamp: new Date()}));
            console.log("getAllInfo result:\n", JSON.stringify(info, null, 2));
        }
        catch (e)
        {
            console.error(e);
        }
    }, 5000);
})().catch(e =>
{
    console.error(e);
    process.exit(1);
});