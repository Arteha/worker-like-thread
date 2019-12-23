import { BaseDTO, Property, Schema } from "typed-dto";

@Schema
export class TimeDTO extends BaseDTO<TimeDTO>
{
    @Property({type: "date"})
    public timestamp: Date;
}