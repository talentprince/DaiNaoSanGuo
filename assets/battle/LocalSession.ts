import { RUNTIME_CONFIG, requireLocalRuntime } from '../data/RuntimeConfig';
import type { RuntimeConfig } from '../data/RuntimeConfig';
import { ProgressStore } from './ProgressStore';
import type { StorageAdapter } from './ProgressStore';
import { createDeveloperStore, configureDeveloper, isLocalDevelopment, MODE_KEY } from './DeveloperMode';
import type { DeveloperSettings } from './DeveloperMode';
import { createExperienceStore } from './ExperienceMode';

/** The current local provider. A future cloud provider must own its own mutations. */
export class LocalSession {
    readonly testAllowed: boolean;
    readonly experienceMode: boolean;
    experienceGiftApplied = false;
    private storage: StorageAdapter;
    constructor(storage: StorageAdapter, host: string, simulator = false, config: RuntimeConfig = RUNTIME_CONFIG) {
        requireLocalRuntime(config);
        this.storage = storage;
        this.experienceMode = config.localProfile === 'experience';
        this.testAllowed = isLocalDevelopment(host, simulator);
    }
    initial(): ProgressStore {
        let normal = false;
        try { normal = this.storage.getItem(MODE_KEY) === 'normal'; } catch (_) {}
        return this.testAllowed && !normal ? createDeveloperStore(this.storage) : this.normal();
    }
    normal(): ProgressStore {
        if (!this.experienceMode) return new ProgressStore(this.storage);
        const result = createExperienceStore(this.storage);
        this.experienceGiftApplied = result.granted;
        return result.store;
    }
    test(reset = false): ProgressStore {
        this.checkTest();
        return createDeveloperStore(this.storage, Date.now, Math.random, reset);
    }
    configure(settings: DeveloperSettings): ProgressStore {
        this.checkTest();
        return configureDeveloper(this.storage, settings);
    }
    remember(mode: 'normal' | 'test'): void {
        if (mode === 'test') this.checkTest();
        try { this.storage.setItem(MODE_KEY, mode); } catch (_) {}
    }
    private checkTest(): void {
        if (!this.testAllowed) throw new Error('测试档仅限本机开发环境');
    }
}
