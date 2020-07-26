import { Provide, BaseWorker } from "../..";
import { Worker } from "../../decorators";
import { InfoDTO } from "./dto/InfoDTO";
import { TimeDTO } from "./dto/TimeDTO";

@Worker({ filePath: __filename })
export class TicksCounter extends BaseWorker
{
    private startedAt: Date;
    private ticks: number = 0;

    public run()
    {
        this.startedAt = new Date();
        setInterval(() => this.tick(), 1000);
    }

    @Provide()
    public async getTicks(): Promise<number>
    {
        return this.ticks;
    }

    @Provide()
    public async getAllInfo(time: TimeDTO): Promise<InfoDTO>
    {
        return {
            startedAt: this.startedAt,
            timeDifference: Date.now() - time.timestamp.getTime(),
            ticks: this.ticks
        };
    }

    private tick()
    {
        this.ticks++;
    }
}