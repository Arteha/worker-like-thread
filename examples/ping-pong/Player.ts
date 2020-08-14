import { Worker, Provide } from "../../src/decorators";
import { Threadlike } from "../../src/core";
import { sleep } from "./utils/sleep";

@Worker({filePath: __filename})
export class Player extends Threadlike
{
    constructor(private readonly pongDelay: number)
    {
        super();
    }

    @Provide()
    public async run(): Promise<void>
    {
        this.on("ping", this.onPing.bind(this));
    }

    private async onPing(count: number)
    {
        console.log("ping:", ++count);

        await sleep(this.pongDelay);

        this.emit("pong", count);
    }
}