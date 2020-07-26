import "reflect-metadata";
import { BaseWorker } from "../core";
import { ACCESSIBLE_SYMBOL } from "../symbols/ACCESSIBLE_SYMBOL";
import { MASTER_SYMBOL } from "../symbols/MASTER_SYMBOL";
import { ProvidedMethodsMeta } from "../types/provided.methods.meta";

export function Thread<T extends { new(...args: any[]): BaseWorker }>(original: T): T
{
    return class extends original
    {
        constructor(...args: any[])
        {
            super(...args);

            const providedMethods: ProvidedMethodsMeta | undefined = Reflect.getMetadata(ACCESSIBLE_SYMBOL, this);
            if(providedMethods)
            {
                if(Reflect.getMetadata(MASTER_SYMBOL, original))
                {
                    for (const p in providedMethods)
                    {
                        const link = this[p];
                        if(process.argv.includes("--thread") || process.argv.includes("-thread"))
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