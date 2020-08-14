import { Worker } from "../../src/decorators";
import { Ticker } from "./Ticker";

@Worker({ filePath: __filename })
export class TickerWithCounter extends Ticker
{
    private ticks: number = 0;

    protected act(): void
    {
        console.log(`[pid: ${process.pid}] TickerWithCounter. Ticks:`, ++this.ticks);
    }
}