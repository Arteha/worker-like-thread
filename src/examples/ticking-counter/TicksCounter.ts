import { Worker, Provide } from "../../decorators";
import { InfoDTO } from "./dto/InfoDTO";
import { TimeDTO } from "./dto/TimeDTO";
import { WorkerLikeThread } from "../../core";
import { AsAttributes } from "typed-dto";

@Worker({filePath: __filename})
export class TicksCounter extends WorkerLikeThread
{
    private startedAt: Date = new Date();
    private ticks: number = 0;

    protected run()
    {
        this.startedAt = new Date();
        setInterval(() => this.tick(), 1000);

        this.on("ping", this.onPing.bind(this));
    }

    private onPing(count: number)
    {
        console.log("ping:", ++count);
        this.emit("pong", count);
    }

    @Provide()
    public async getTicks(): Promise<number>
    {
        return this.ticks;
    }

    @Provide()
    public async getAllInfo(time: AsAttributes<TimeDTO>): Promise<InfoDTO>
    {
        time = TimeDTO.createOrFail(time);
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