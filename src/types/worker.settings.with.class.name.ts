import { WorkerSettings } from "./worker.settings";

export type WorkerSettingsWithClassName = WorkerSettings & {
    className: string
}