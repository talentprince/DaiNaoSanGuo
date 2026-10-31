import { ProgressStore } from './ProgressStore';
import type { StorageAdapter, Progress } from './ProgressStore';

export const EXPERIENCE_KEY = 'dainaosanguo.experience.progress.v1';
export const EXPERIENCE_GIFT = { coins: 10000000, daibi: 1000000, points: 1000000, souls: 100000, experience: 100000000 } as const;
interface ExperienceEnvelope { version: 1; grantVersion: 1; progress: Progress; }

/** Local internal-test assets. Never use this adapter for a cloud account. */
export function createExperienceStore(storage: StorageAdapter): { store: ProgressStore; granted: boolean } {
    let envelope: ExperienceEnvelope | null = null;
    try {
        const raw = storage.getItem(EXPERIENCE_KEY);
        const data = raw ? JSON.parse(raw) : null;
        if (data?.version === 1 && data.grantVersion === 1 && data.progress?.version === 1
            && Array.isArray(data.progress.owned)) envelope = data;
    } catch (_) {}
    const granted = !envelope;
    if (!envelope) {
        // One-way copy preserves the player's first phone session. The original save is untouched.
        const progress = new ProgressStore(storage).progress;
        for (const key of ['coins', 'daibi', 'points', 'souls', 'experience'] as const) {
            progress[key] = Math.min(Number.MAX_SAFE_INTEGER, progress[key] + EXPERIENCE_GIFT[key]);
        }
        envelope = { version: 1, grantVersion: 1, progress };
    }
    let serialized = JSON.stringify(envelope);
    let saved = true;
    if (granted) try { storage.setItem(EXPERIENCE_KEY, serialized); } catch (_) { saved = false; }
    const adapter: StorageAdapter = {
        getItem: () => JSON.stringify((JSON.parse(serialized) as ExperienceEnvelope).progress),
        setItem: (_, raw) => {
            const next = JSON.stringify({ version: 1, grantVersion: 1, progress: JSON.parse(raw) });
            storage.setItem(EXPERIENCE_KEY, next);
            serialized = next;
        },
    };
    const store = new ProgressStore(adapter);
    if (!saved) store.storageAvailable = false;
    return { store, granted };
}
