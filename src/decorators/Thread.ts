import "reflect-metadata";
import { BaseWorker } from "../core";
import { ACCESSIBLE_SYMBOL } from "../symbols/ACCESSIBLE_SYMBOL";
import { PropsMeta } from "../types/props.meta";
import { MASTER_SYMBOL } from "../symbols/MASTER_SYMBOL";

export function Thread<T extends { new(...args: any[]): BaseWorker }>(original: T): T
{
    return class extends original
    {
        constructor(...args: any[])
        {
            super(...args);

            const propsMeta: PropsMeta | undefined = Reflect.getMetadata(ACCESSIBLE_SYMBOL, this);
            if(propsMeta)
            {
                if(Reflect.getMetadata(MASTER_SYMBOL, original))
                {
                    for (const p in propsMeta)
                    {
                        const link = this[p];
                        this[p] = async function(...args: any[])
                        {
                            return new Promise<any>((resolve, reject) =>
                            {
                                // TODO: add task
                            });
                        }
                    }
                }
            }
        }
    } as any;
}