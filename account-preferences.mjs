export function cleanPreferences(value, allowed) {
  return {
    theme: value?.theme === 'dark' ? 'dark' : 'light',
    favorites: [...new Set(Array.isArray(value?.favorites) ? value.favorites : [])].filter(id => allowed.has(id)).slice(0, 100),
  };
}

// Serialize writes: a slower previous request must not overwrite the latest edit.
export function createPreferenceSync(client, allowed, report) {
  let generation = 0, userId = null, ready = false, queue = Promise.resolve(), draft = null;
  return {
    async connect(id, local, apply) {
      const epoch = ++generation; userId = id; ready = false; draft = null;
      if (!id) return;
      const { data, error } = await client.from('account_preferences').select('theme,favorites').eq('user_id', id).maybeSingle();
      if (epoch !== generation) return;
      if (error) { report('Sincronizzazione non disponibile. Puoi continuare sul dispositivo.'); return; }
      if (draft) { ready = true; this.save(draft); draft = null; return; }
      if (data) apply(cleanPreferences(data, allowed));
      ready = true;
      if (!data) this.save(local);
      else report('Preferenze sincronizzate.');
    },
    save(value) {
      if (!userId) return queue;
      if (!ready) { draft = cleanPreferences(value, allowed); return queue; }
      const epoch = generation, owner = userId, preferences = cleanPreferences(value, allowed);
      queue = queue.catch(() => {}).then(async () => {
        if (epoch !== generation) return;
        const { error } = await client.from('account_preferences').upsert({ user_id: owner, ...preferences }, { onConflict: 'user_id' });
        if (epoch === generation) report(error ? 'Modifica locale salvata. Riprova la sincronizzazione.' : 'Preferenze sincronizzate.');
      }).catch(() => { if (epoch === generation) report('Connessione non disponibile. Le modifiche restano locali.'); });
      return queue;
    },
    disconnect() { generation++; userId = null; ready = false; draft = null; },
  };
}
