import "reflect-metadata";
import { REMOTE_ACCESS_SYMBOL } from "../symbols/REMOTE_ACCESS_SYMBOL";
import { BaseWorker } from "../core";

export function Provide()
{
    return function (target: BaseWorker, propertyKey: string | undefined): void
    {
        if (propertyKey == undefined)
            throw new TypeError();

        Reflect.defineMetadata(REMOTE_ACCESS_SYMBOL, true, target, propertyKey);
    };
}