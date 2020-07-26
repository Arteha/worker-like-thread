import "reflect-metadata";
import { REMOTE_PROPERTIES_SYMBOL } from "../symbols/REMOTE_PROPERTIES_SYMBOL";
import { WorkerLikeThread } from "../core";
import { RemoteProperties } from "../types/remote.properties";

export function Provide()
{
    return function (target: WorkerLikeThread, propertyKey: string | undefined): void
    {
        if (propertyKey == undefined)
            throw new TypeError();

        const props: RemoteProperties = Reflect.getMetadata(REMOTE_PROPERTIES_SYMBOL, target) || {};
        props[propertyKey] = true;

        Reflect.defineMetadata(REMOTE_PROPERTIES_SYMBOL, props, target);
    };
}