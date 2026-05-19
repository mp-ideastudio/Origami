export default class SaveSystem {
    static KEY = 'origami.v8.save.slot0';

    static save(state) {
        try {
            const data = {
                schemaVersion: 1,
                floor: state.floor,
                px: state.px,
                pz: state.pz,
                rot: state.rot,
                hp: state.hp,
                karma: state.karma,
                deck: state.deck || [],
                mapSeed: state.mapSeed || Math.random(),
                monstersAlive: state.monstersAlive || [],
                savedAt: Date.now()
            };
            localStorage.setItem(this.KEY, JSON.stringify(data));
            console.log(`[SaveSystem] Saved game at floor ${state.floor}`);
            return true;
        } catch (e) {
            console.error('[SaveSystem] Save failed:', e);
            return false;
        }
    }

    static load() {
        try {
            const raw = localStorage.getItem(this.KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (data.schemaVersion !== 1) {
                console.warn('[SaveSystem] Unsupported schema version:', data.schemaVersion);
                return null;
            }
            console.log(`[SaveSystem] Loaded game from floor ${data.floor}`);
            return data;
        } catch (e) {
            console.error('[SaveSystem] Load failed:', e);
            return null;
        }
    }

    static clear() {
        try {
            localStorage.removeItem(this.KEY);
            console.log('[SaveSystem] Cleared save slot');
            return true;
        } catch (e) {
            console.error('[SaveSystem] Clear failed:', e);
            return false;
        }
    }
}
