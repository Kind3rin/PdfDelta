import { accountConfig } from './account-config.mjs';
import { createPreferenceSync, createPreferenceJournal } from './account-preferences.mjs';
import { tools } from './tool-catalog.mjs';

export async function initAccount(bridge, config = accountConfig) {
  if (!config.enabled) return;
  const { createClient } = await import('./vendor/account-client.mjs');
  const client = createClient(config.url, config.key, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const open = document.createElement('button'); open.type = 'button'; open.className = 'account-open'; open.textContent = 'Accedi';
  document.querySelector('.header-actions').prepend(open);
  const dialog = document.createElement('dialog'); dialog.className = 'account-dialog'; dialog.setAttribute('aria-labelledby', 'accountTitle');
  dialog.innerHTML = '<button type="button" class="account-close" aria-label="Chiudi account">×</button><h2 id="accountTitle">Il tuo PdfDelta</h2><p>Ritrova tema e strumenti preferiti su ogni dispositivo. I tuoi PDF e le tue firme restano qui.</p><p class="account-identity"></p><button type="button" class="account-login">Continua con Google</button><button type="button" class="account-retry" hidden>Riprova sincronizzazione</button><button type="button" class="account-logout" hidden>Esci dall’account</button><p class="account-status" role="status"></p><small>Puoi usare tutti gli strumenti anche senza account. <a href="privacy.html">Privacy</a></small>';
  document.body.append(dialog);
  const status = text => { dialog.querySelector('.account-status').textContent = text; };
  const sync = createPreferenceSync(client, new Set(tools.map(tool => tool.id)), status, createPreferenceJournal(localStorage));
  let user = null, guest = bridge.getPreferences(), connecting = null;
  try { const saved = JSON.parse(localStorage.getItem('pdfdelta-guest-preferences')); if (saved) guest = saved; } catch { /* Preserve current local defaults. */ }
  open.onclick = () => dialog.showModal(); dialog.querySelector('.account-close').onclick = () => dialog.close();
  window.addEventListener('pdfdelta-preferences', () => { if (user) void sync.save(bridge.getPreferences()); });
  const load = async () => {
    try { await sync.connect(user?.id, bridge.getPreferences(), value => bridge.applyPreferences(value)); }
    catch { status('Sincronizzazione non disponibile. Riprova quando sei online.'); }
  };
  const setSession = async session => {
    const next = session?.user || null;
    if (next?.id === user?.id) return;
    sync.disconnect();
    if (!user && next && !localStorage.getItem('pdfdelta-guest-preferences')) {
      guest = bridge.getPreferences(); localStorage.setItem('pdfdelta-guest-preferences', JSON.stringify(guest));
    }
    if (user) bridge.applyPreferences(guest);
    user = next;
    open.textContent = user ? 'Account' : 'Accedi';
    dialog.querySelector('.account-identity').textContent = user?.email || '';
    dialog.querySelector('.account-login').hidden = !!user;
    dialog.querySelector('.account-logout').hidden = !user;
    dialog.querySelector('.account-retry').hidden = !user;
    if (user) await load(); else { localStorage.removeItem('pdfdelta-guest-preferences'); status('Hai effettuato la disconnessione.'); }
  };
  client.auth.onAuthStateChange((_event, session) => { setTimeout(() => { connecting = setSession(session); void connecting.catch(() => status('Accesso non disponibile. Riprova.')); }, 0); });
  const { data, error } = await client.auth.getSession();
  if (!data.session && localStorage.getItem('pdfdelta-guest-preferences')) {
    bridge.applyPreferences(guest); localStorage.removeItem('pdfdelta-guest-preferences');
  }
  if (error) status('Accesso non riuscito. Riprova.'); else await setSession(data.session);
  dialog.querySelector('.account-login').onclick = async () => {
    if (bridge.getAllFiles().length) { status('Scarica il documento e svuota la sessione prima di accedere: Google apre una nuova pagina.'); return; }
    const button = dialog.querySelector('.account-login'); button.disabled = true;
    try { const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: new URL('./', location.href).href } }); if (error) throw error; }
    catch { status('Accesso Google non disponibile. Riprova più tardi.'); button.disabled = false; }
  };
  dialog.querySelector('.account-retry').onclick = () => { void load(); };
  dialog.querySelector('.account-logout').onclick = async () => {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) status('Disconnessione non riuscita. Riprova.'); else await setSession(null);
  };

}
