import "reflect-metadata";
import { ACCESSIBLE_SYMBOL } from "../symbols/ACCESSIBLE_SYMBOL";
import { BaseWorker } from "../core";
import { ProvidedMethodsMeta } from "../types/provided.methods.meta";

export function Provide()
{
    return function (target: BaseWorker, propertyKey: string | undefined): void
    {
        if (propertyKey == undefined)
            throw new TypeError();

        const propsMeta = Reflect.getMetadata(ACCESSIBLE_SYMBOL, target);
        const props: ProvidedMethodsMeta = propsMeta || {};
        props[propertyKey] = true;
        if(!propsMeta)
            Reflect.defineMetadata(ACCESSIBLE_SYMBOL, props, target);
    };
}