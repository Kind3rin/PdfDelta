try {
  await import('./pdf-engine.mjs');
  const app = await import('./app.js');
  const { initWorkspace } = await import('./workspace.mjs');
  const workspace = initWorkspace(app.workspaceBridge);
  const { initFlow } = await import('./workspace-flow.mjs');
  initFlow(app.workspaceBridge, workspace);
  import('./account.mjs').then(({ initAccount }) => initAccount(app.workspaceBridge)).catch(() => console.warn('Account non disponibile; strumenti locali pronti.'));
} catch (error) {
  const panel = document.querySelector('#resultPanel');
  if (panel) panel.textContent = `Avvio non riuscito: ${error.message}. Ricarica la pagina da un server locale o dal sito.`;
  console.error(error);
}
