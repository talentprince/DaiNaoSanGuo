import { ProgressStore } from './ProgressStore';
import type { StorageAdapter } from './ProgressStore';

export const EXPERIENCE_KEY = 'dainaosanguo.experience.progress.v2';
export const EXPERIENCE_MULTIPLIER = 2;

/** Separate the new grind test from both the old grant save and the standard campaign. */
export function createExperienceStore(storage: StorageAdapter): { store: ProgressStore; granted: boolean } {
    const adapter: StorageAdapter = {
        getItem: () => storage.getItem(EXPERIENCE_KEY),
        setItem: (_, raw) => storage.setItem(EXPERIENCE_KEY, raw),
    };
    let granted = false;
    try { granted = !storage.getItem(EXPERIENCE_KEY); } catch (_) {}
    const store = new ProgressStore(adapter, Date.now, Math.random, { experienceMultiplier: EXPERIENCE_MULTIPLIER });
    if (granted) try { adapter.setItem('', JSON.stringify(store.progress)); } catch (_) { store.storageAvailable = false; }
    return { store, granted };
}
