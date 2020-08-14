import { TicksCounter } from "./TicksCounter";
import { InfoDTO } from "./dto/InfoDTO";


(async () =>
{
    console.log("Running worker...");

    // Only serializable arguments can be passed
    const worker = new TicksCounter(3000);

    // Spawning in separate process
    await worker.spawn();

    // Execution of provided function
    await worker.run(1000);
    console.log("Worker successfully started.");

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
    }, 3000);


    setTimeout(() => process.exit(0), 10000);
})().catch(e =>
{
    console.error(e);
    process.exit(1);
});