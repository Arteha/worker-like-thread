import { Accesible, BaseWorker } from "../..";
import { Thread } from "../..";
import { InfoDTO } from "./dto/InfoDTO";
import { TimeDTO } from "./dto/TimeDTO";

@Thread
export class TicksCounter extends BaseWorker
{
    private startedAt: Date;
    private ticks: number = 0;

    public run()
    {
        this.startedAt = new Date();
        setInterval(() => this.tick(), 1000);
    }

    @Accesible("number")
    public async getTicks(): Promise<number>
    {
        return this.ticks;
    }

    @Accesible({args: TimeDTO, result: InfoDTO})
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