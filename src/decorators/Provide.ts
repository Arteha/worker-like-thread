import "reflect-metadata";
import { REMOTE_ACCESS_SYMBOL } from "../symbols/REMOTE_ACCESS_SYMBOL";
import { WorkerLikeThread } from "../core/WorkerLikeThread";

export function Provide()
{
    return function (target: WorkerLikeThread, propertyKey: string | undefined): void
    {
        if (propertyKey == undefined)
            throw new TypeError();

        Reflect.defineMetadata(REMOTE_ACCESS_SYMBOL, true, target, propertyKey);
    };
}