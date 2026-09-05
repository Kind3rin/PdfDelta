import fs from 'node:fs';
import { tools } from '../tool-catalog.mjs';

const report = JSON.parse(fs.readFileSync(process.argv[2] || 'dist/verification/output-report.json', 'utf8'));
const checks = report.value?.outputChecks;
if (!report.ok || !checks) throw new Error('Serve una verifica completata con successo.');
const active = tools.filter(tool => tool.status !== 'bloccato');
if (active.some(tool => !checks[tool.id])) throw new Error('Copertura incompleta del catalogo attivo.');
const rows = active.map(tool => {
  const check = checks[tool.id];
  const evidence = check.format === 'pdf' ? `${check.pages} pagine riaperte e renderizzate`
    : check.format === 'zip' ? `${check.entries.length} file interni riaperti; CRC valido`
    : check.format === 'docx' ? 'Struttura ZIP/XML e testo verificati'
    : check.width ? `Immagine decodificata: ${check.width} × ${check.height}`
    : 'Contenuto testuale non vuoto';
  return `| ${tool.name} | ${check.format.toUpperCase()} | ${evidence} |`;
});
fs.writeFileSync('docs/OUTPUT-VERIFICATION.md', `# Verifica degli output

${active.length}/${active.length} strumenti attivi: almeno un caso sintetico riuscito per strumento.
Generato da verify-local.js e scripts/report-output-verification.mjs.

I PDF sono riaperti con pdf-lib e PDF.js, verificati nel numero di pagine e renderizzati.
Controlli mirati verificano ordine/estrazione pagine, testo della firma e dei moduli,
metadati, annotazioni, allegati e suddivisioni ZIP. L'export finale senza modifiche
alle pagine è verificato anche byte per byte dalla suite workspace.

Questa è copertura del caso di successo, non di ogni opzione o documento possibile.
CSV, TXT e HTML hanno controlli di base; non tutte le proprietà semantiche sono
verificate. La suite degli strumenti gira in Chrome desktop. Il workspace dispone
anche di prove responsive ed editor mobile, ma queste non sostituiscono la prova
manuale di ciascuno strumento su telefono e altri browser.

| Strumento | Formato | Evidenza |
| --- | --- | --- |
${rows.join('\n')}
`);
