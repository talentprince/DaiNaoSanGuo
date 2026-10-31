export type ServiceMode = 'local' | 'cloud';
export interface RuntimeConfig { readonly serviceMode: ServiceMode; readonly localProfile?: 'standard' | 'experience'; }

/** Build-time choice. Never read authority mode from a URL or player save. */
export const RUNTIME_CONFIG: RuntimeConfig = { serviceMode: 'local', localProfile: 'experience' };

export class BackendNotReadyError extends Error {
    constructor() { super('云端账号与结算尚未接入，请使用本地版本。'); this.name = 'BackendNotReadyError'; }
}

/** Fail closed: choosing cloud must never silently issue local rewards. */
export function requireLocalRuntime(config: RuntimeConfig = RUNTIME_CONFIG): void {
    if (config.serviceMode !== 'local') throw new BackendNotReadyError();
}
