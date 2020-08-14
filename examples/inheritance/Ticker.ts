import { Loop } from "./Loop";
import { Worker } from "../../src/decorators";

@Worker({ filePath: __filename })
export class Ticker extends Loop
{
    constructor(messageDelayInSeconds: number)
    {
        super(messageDelayInSeconds * 1000, true);
    }

    protected act(): void
    {
        console.log(`[pid: ${process.pid}] Ticker.`);
    }
}