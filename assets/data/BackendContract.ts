import type { WorldBossDefinition } from './WorldBossConfig';

/** Read-only protocol shared by the local backend prototype and its tests. */
export interface BackendBootstrap {
    apiVersion: 1;
    configVersion: string;
    serverTime: number;
    capabilities: { authentication: false; cloudSave: false; economy: false; ranking: false };
    worldBoss: { current: WorldBossDefinition; week: number; nextAt: number; rotation: WorldBossDefinition[] };
}
