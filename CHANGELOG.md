# Changelog

## Unreleased design notes

- Propose guaranteed story recruits and starter equipment alongside dungeon-specific rare officers and weapons. Document a high-difficulty prototype with visible drop tables and per-target clear guarantees.

## 0.15.2 — Character and troop variety

- Give each officer a stable combination of face shape, expression, complexion, and facial details. Share the drawings across portraits and battle models.
- Give the six enemy archetypes distinct uniform colors and recognizable armor, wraps, straps, collars, or robes.
- Record offline progression proposals for personal boss records, task-based recruitment, targeted drops, and local computer opponents. The proposals are separate from the current progression rules.

## 0.15.1 — Full-screen layout and test audio

- Adapt the wallet and battle layout to the WeChat capsule, notch and bottom gesture area. Keep combat status, version text and skill charge readable over bright maps.
- Fit full-field skill washes and boss flashes to the battle area. Keep skill banners clear of the side controls.
- Start development and experience profiles with background music off. Keep combat sound effects available and save music preferences separately from the master sound setting.
- Add layout and audio regression coverage. All 181 tests and the strict TypeScript check pass. The matching WeChat development build passed preflight and was uploaded. Experience-version selection and device retesting are pending.

## 0.15.0 — Comic siege and skill charge

- Redraw the siege gate and its defender platforms. Replace the gate with masonry and broken timber when it falls.
- Expose automatic casting beside the skill portraits and in the battle menu. Start new profiles with automatic casting on and preserve explicit player choices.
- Give surviving officers one point of base skill charge per one percent of maximum health lost. Include damage over time and exclude damage absorbed by shields.
- Recompose nine scene tracks as a comic adventure score and replace the boss warning with two low buzzes.
- Preserve the 9:16 aspect ratio in the Cocos source preview. Build and verify Web and WeChat packages from the same source.

## 0.14.0 — Battle controls and illustrated activities

- Enlarge enemy units and improve the visual separation of elite encounters.
- Add round-robin automatic skills, queued manual casts and clearer readiness states. Save casting preferences separately for each profile.
- Show all four illustrated activity cards in a two-by-two grid. Confirm switching away from unfinished runs and preserve the old run if validation fails.
- Serve audio in the Cocos source preview and separate the channels for weapon hits and boss warnings. Fix effect cleanup and stamp builds with a source fingerprint.

## Earlier milestones

- **0.13** — Multi-wave encounters, elite enemies, side-on siege and contextual battle audio.
- **0.12** — Continuous mainline scenes, comic bosses, visible hit reactions and signature weapon access.
- **0.11** — Weekly world bosses, original music, local and experience profiles, and a read-only backend prototype.
- **0.10** — Comic hero cards, formation bonds, sustained elemental effects and an isolated developer profile.
- **0.8–0.9** — Formation editing, mixed troops, tiered skills, loadouts, signature weapons, stars and 999 mainline stages.
- **0.6 and earlier** — Portrait Cocos prototype, automatic battles, equipment, hero collection and the first WeChat simulator runs.
