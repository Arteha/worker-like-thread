import { BaseDTO, Property, Schema } from "typed-dto";

@Schema
export class InfoDTO extends BaseDTO<InfoDTO>
{
    @Property({type: "date"})
    public startedAt: Date;

    @Property({type: "number"})
    public ticks: number;

    @Property({type: "number"})
    public timeDifference: number;
}