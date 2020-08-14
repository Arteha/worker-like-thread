import { Provide, Worker } from "../../src/decorators";
import { Threadlike } from "../../src/core";
import { sleep } from "./utils/sleep";

@Worker({filePath: __filename})
export class Loop extends Threadlike
{
    public readonly isAsync: boolean;
    private running: boolean = false;
    private timeoutId: any = null;
    private loopId = Number.MIN_SAFE_INTEGER;

    constructor(private delay: number, isAsync?: boolean)
    {
        super();

        this.isAsync = !!isAsync;
    }

    @Provide()
    public async setDelay(delay: number): Promise<void>
    {
        this.delay = delay;
    }

    @Provide()
    public async isRunning(): Promise<boolean>
    {
        return this.running;
    }

    @Provide()
    public async run(): Promise<void>
    {
        this.stop();

        this.running = true;

        this.loopId++;
        if (this.loopId >= Number.MAX_SAFE_INTEGER)
            this.loopId = Number.MIN_SAFE_INTEGER;

        await this.loop(this.loopId);
    }

    @Provide()
    public async stop(): Promise<void>
    {
        this.running = false;
        if (this.timeoutId)
            clearTimeout(this.timeoutId);
    }

    protected act(): void | Promise<void>
    {
        console.log(`[pid: ${process.pid}] Loop act.`);
    }

    private async loop(loopId: number): Promise<void>
    {
        do
        {
            if (loopId != this.loopId)
                break;

            if (!this.isAsync)
            {
                if (this.running)
                {
                    await this.act();
                    await sleep(this.delay);
                }
                else
                    break;
            }
            else
            {
                if (this.running)
                {
                    this.act();
                    this.timeoutId = setTimeout(() => this.loop(loopId), this.delay);
                }
                break;
            }
        }
        while (true)
    }
}