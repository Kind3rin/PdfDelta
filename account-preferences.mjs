export function cleanPreferences(value, allowed) {
  return {
    theme: value?.theme === 'dark' ? 'dark' : 'light',
    favorites: [...new Set(Array.isArray(value?.favorites) ? value.favorites : [])].filter(id => allowed.has(id)).slice(0, 100),
  };
}

// Only unsent preferences, scoped by account. Never credentials or document data.
export function createPreferenceJournal(storage) {
  const memory = new Map();
  const memoryOnly = new Set();
  const key = owner => `pdfdelta-pending-preferences:${owner}`;
  return {
    read(owner) {
      if (memoryOnly.has(owner)) return memory.get(owner) || null;
      try {
        const entry = JSON.parse(storage.getItem(key(owner)));
        return entry && typeof entry.version === 'string' && entry.preferences ? entry : null;
      } catch { return memory.get(owner) || null; }
    },
    write(owner, entry) {
      memory.set(owner, entry);
      try { storage.setItem(key(owner), JSON.stringify(entry)); memoryOnly.delete(owner); return true; }
      catch { memoryOnly.add(owner); return false; }
    },
    remove(owner, version) {
      if (this.read(owner)?.version !== version) return;
      memory.delete(owner);
      memoryOnly.delete(owner);
      try { storage.removeItem(key(owner)); } catch { /* Retry stays safe if storage is unavailable. */ }
    },
  };
}

// Serialize requests and retain the latest unacknowledged edit across retry/reload.
export function createPreferenceSync(client, allowed, report, journal = createPreferenceJournal()) {
  let generation = 0, userId = null, ready = false, queue = Promise.resolve(), draft = null;
  const failed = () => report('Modifiche in attesa. Riprova la sincronizzazione quando sei online.');
  return {
    async connect(id, local, apply) {
      const previous = userId === id ? draft : null;
      const epoch = ++generation; userId = id; ready = false;
      draft = id ? journal.read(id) || previous : null;
      if (!id) return;
      if (draft) apply(cleanPreferences(draft.preferences, allowed));
      let result;
      try { result = await client.from('account_preferences').select('theme,favorites').eq('user_id', id).maybeSingle(); }
      catch { if (epoch === generation) failed(); return; }
      if (epoch !== generation) return;
      if (result.error) { report('Sincronizzazione non disponibile. Le modifiche rimangono in attesa.'); return; }
      ready = true;
      if (draft) return this.save(draft.preferences);
      if (result.data) { apply(cleanPreferences(result.data, allowed)); report('Preferenze sincronizzate.'); }
      else return this.save(local);
    },
    save(value) {
      if (!userId) return queue;
      const epoch = generation, owner = userId, preferences = cleanPreferences(value, allowed);
      const entry = { version: crypto.randomUUID(), preferences };
      draft = entry;
      const durable = journal.write(owner, entry);
      report(durable ? 'Salvataggio in corso…' : 'Salvataggio in corso. Mantieni aperta la pagina: memoria locale non disponibile.');
      if (!ready) { failed(); return queue; }
      queue = queue.catch(() => {}).then(async () => {
        if (epoch !== generation) return;
        const { error } = await client.from('account_preferences').upsert({ user_id: owner, ...preferences }, { onConflict: 'user_id' });
        if (epoch !== generation) return;
        if (error) { failed(); return; }
        journal.remove(owner, entry.version);
        if (draft?.version === entry.version) {
          draft = null;
          report('Preferenze sincronizzate.');
        }
      }).catch(() => { if (epoch === generation) failed(); });
      return queue;
    },
    disconnect() { generation++; userId = null; ready = false; draft = null; },
  };
}
