import "reflect-metadata";
import { WorkerLikeThread } from "../core";
import { WORKER_SETTINGS_SYMBOL } from "../symbols/WORKER_SETTINGS_SYMBOL";
import { WorkerSettings } from "../types";
import { WorkerSettingsWithClassName } from "../types/worker.settings.with.class.name";


export function Worker(settings: WorkerSettings)
{
    return function <T extends { new(...args: any[]): WorkerLikeThread }>(original: T): T
    {
        const settingsExtended: WorkerSettingsWithClassName = {
            ...settings,
            className: original.constructor.name
        }
        Reflect.defineMetadata(WORKER_SETTINGS_SYMBOL, settingsExtended, original);
        return original;
    }
}