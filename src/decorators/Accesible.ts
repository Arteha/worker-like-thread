import "reflect-metadata";
import { ACCESSIBLE_SYMBOL } from "../symbols/ACCESSIBLE_SYMBOL";
import { BaseWorker } from "../core";
import { AccessibleOptions } from "../types";
import { PropsMeta } from "../types/props.meta";

export function Accesible(options?: AccessibleOptions)
{
    return function (target: BaseWorker, propertyKey: string | undefined): void
    {
        if (propertyKey == undefined)
            throw new TypeError();

        const propsMeta = Reflect.getMetadata(ACCESSIBLE_SYMBOL, target);
        const props: PropsMeta = propsMeta || {};
        props[propertyKey] = options || null;
        if(!propsMeta)
            Reflect.defineMetadata(ACCESSIBLE_SYMBOL, props, target);
    };
}