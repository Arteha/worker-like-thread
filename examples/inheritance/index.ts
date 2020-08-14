import { Loop } from "./Loop";
import { Ticker } from "./Ticker";
import { TickerWithCounter } from "./TickerWithCounter";


(async () =>
{
    console.log(`[pid: ${process.pid}] Master.`);

    // Only serializable arguments can be passed
    const loop = new Loop(1000, true);
    const ticker = new Ticker(1); // extends Loop
    const tickerWithCounter = new TickerWithCounter(1); // extends Ticker

    // Spawning in separate processes
    await loop.spawn();
    await ticker.spawn();
    await tickerWithCounter.spawn();

    // Execution of provided function
    await loop.run();
    await ticker.run();
    await tickerWithCounter.run();

    setTimeout(() =>
    {
        loop.terminate();
        ticker.terminate();
        tickerWithCounter.terminate();
    }, 3000);
})().catch(e =>
{
    console.error(e);
    process.exit(1);
});