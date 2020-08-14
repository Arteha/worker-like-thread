import "reflect-metadata";
import { Threadlike } from "../core";
import { WORKER_SETTINGS_SYMBOL } from "../symbols/WORKER_SETTINGS_SYMBOL";
import { WorkerSettings } from "../types";
import { WorkerSpawnSettings } from "../types/worker.spawn.settings";


export function Worker(settings: WorkerSettings)
{
    return function <T extends { new(...args: any[]): Threadlike }>(original: T): T
    {
        return class extends original
        {
            constructor(...args: any[])
            {
                super(...args);

                const extendedSettings: WorkerSpawnSettings = {
                    ...settings,
                    className: original.name,
                    args
                };
                Reflect.defineMetadata(WORKER_SETTINGS_SYMBOL, extendedSettings, this);
            }
        } as any;
    }
}