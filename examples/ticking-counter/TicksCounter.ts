import { Worker, Provide } from "../../src/decorators";
import { InfoDTO } from "./dto/InfoDTO";
import { TimeDTO } from "./dto/TimeDTO";
import { Threadlike } from "../../src/core";
import { AsAttributes } from "typed-dto";

@Worker({filePath: __filename})
export class TicksCounter extends Threadlike
{
    private startedAt: Date = new Date();
    private ticks: number = 0;

    constructor(private readonly pongDelay: number)
    {
        super();
    }

    @Provide()
    public async run(interval: number): Promise<void>
    {
        setInterval(() => this.tick(), interval);
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