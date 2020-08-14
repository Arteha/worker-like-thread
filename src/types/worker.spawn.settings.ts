import { WorkerSettings } from "./worker.settings";

export type WorkerSpawnSettings = WorkerSettings & {
    className: string
    args: any[]
}