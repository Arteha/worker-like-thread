import { Player } from "./Player";
import { sleep } from "./utils/sleep";


(async () =>
{
    console.log("Running worker...");

    // Only serializable arguments can be passed
    const player = new Player(2000);

    // Spawning in separate process
    await player.spawn();

    // Execution of provided function
    await player.run();
    console.log("Worker successfully started.");

    player.on("pong", async (count: number) =>
    {
        console.log("pong:", ++count);
        await sleep(1000);
        player.emit("ping", count);
    });

    player.emit("ping", 0);

    setTimeout(() => player.terminate(), 10000);
})().catch(e =>
{
    console.error(e);
    process.exit(1);
});