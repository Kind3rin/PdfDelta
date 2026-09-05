import { tools } from './tool-catalog.mjs';

export function createHome({ onTool, onUpload, onDemo, onResume }) {
  const home = document.createElement('section'); home.id = 'toolHome'; home.setAttribute('aria-labelledby', 'homeTitle');
  home.innerHTML = `<div class="home-hero"><div class="home-promise"><span></span> I tuoi file restano tuoi</div><h1 id="homeTitle">I tuoi PDF.<br>Tutto più semplice.</h1><p>Unisci, dividi, converti e firma.<br>Scegli cosa vuoi fare, al resto pensiamo qui.</p><div class="home-hero-actions"><button id="homeUpload" type="button">Apri un documento</button><button id="homeDemo" type="button">Prova con un esempio</button></div></div><div class="home-catalog-head"><h2>Cosa vuoi fare oggi?</h2><label class="home-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input id="homeSearch" type="search" placeholder="Cerca uno strumento" aria-label="Cerca uno strumento PDF"></label></div><div class="home-filters" role="group" aria-label="Categorie strumenti"></div><div class="home-grid"></div><p id="homeNoResults" hidden>Nessuno strumento trovato. Prova “firma”, “JPG” o “pagine”.</p><div class="home-bottom"><div><strong>Il tuo documento, sul tuo dispositivo.</strong><p>Nessun account. Nessun upload dei PDF. Puoi continuare a lavorare anche offline dopo la prima apertura.</p></div><button type="button" id="homeResume" hidden>Riprendi il documento</button></div>`;
  const popular = ['merge','split','compress-scan','edit-pdf','pdf-to-jpg','images-to-pdf','pdf-to-word','extract-pages','rotate','page-numbers','watermark','clean-metadata'];
  const scene=document.createElement('div'); scene.className='home-paper-scene'; scene.setAttribute('aria-hidden','true');
  scene.innerHTML='<div class="home-paper back"></div><div class="home-paper front"><span>PdfDelta</span><strong>Fatto, in pochi clic.</strong><i></i><i></i><i></i><svg viewBox="0 0 180 55" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 40C35-10 50 0 30 40S20 0 62 27s15-3 34-9 6 33 30 3 5 20 43 8"/></svg><b>Il tuo prossimo PDF</b></div><div class="home-paper-check">✓</div>';
  home.querySelector('.home-hero').append(scene);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  scene.onpointermove=event=>{ if(motion.matches || event.pointerType==='touch') return; const r=scene.getBoundingClientRect(); scene.querySelector('.front').style.transform=`rotateY(${(event.clientX-r.x-r.width/2)/24}deg) rotateX(${-(event.clientY-r.y-r.height/2)/24}deg) rotate(-5deg)`; };
  scene.onpointerleave=()=>{scene.querySelector('.front').style.transform='';};
  const custom = {
    merge:['Unisci PDF','Metti insieme più documenti, nell’ordine che vuoi.'], split:['Dividi PDF','Ottieni un PDF separato per ogni pagina.'],
    'edit-pdf':['Compila e firma','Aggiungi testo e crea una firma da usare dove vuoi.'], 'compress-scan':['Comprimi scansioni','Riduci il peso dei PDF che contengono pagine scansionate.'],
    'pdf-to-jpg':['PDF in JPG','Trasforma le pagine del PDF in immagini.'], 'images-to-pdf':['Immagini in PDF','Raccogli foto e immagini in un unico documento.'],
    'pdf-to-word':['PDF in Word','Estrai il testo in un file Word modificabile.'], 'rotate':['Ruota PDF','Rimetti le pagine nel verso giusto.'],
    'clean-metadata':['Pulisci metadati','Rimuovi autore, titolo e informazioni nascoste del file.']
  };
  const paths = {
    merge:'M8 3v6H3m13-6v6h5M3 3l7 7m11-7-7 7M5 14v7h14v-7', split:'M9 3H3v6m18 0V3h-6M3 3l7 7m11-7-7 7M5 14v7h14v-7',
    'edit-pdf':'m15 4 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14z',
    'compress-scan':'M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5',
    'pdf-to-jpg':'M3 3h18v18H3zM3 16l5-5 4 4 3-3 6 6M7 7h2',
    'images-to-pdf':'M5 3h10l4 4v14H5zM14 3v6h5M8 15h8m-4-4v8',
    rotate:'M20 8a8 8 0 1 0 0 8M20 3v6h-6',
    'clean-metadata':'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6'
  };
  const active = tools.filter(tool=>tool.status==='attivo');
  let category = 'Popolari';
  const categories = ['Popolari','Tutti','Organizza','Converti','Modifica','Ottimizza','Privacy','Analisi'];
  const filters = home.querySelector('.home-filters');
  for (const name of categories) { const button=document.createElement('button'); button.type='button'; button.textContent=name; button.onclick=()=>{category=name; render();}; filters.append(button); }
  function render() {
    const query=home.querySelector('input').value.trim().toLocaleLowerCase('it');
    filters.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.textContent===category)));
    const list=(category==='Popolari' && !query ? popular.map(id=>active.find(tool=>tool.id===id)).filter(Boolean) : active).filter(tool=>(category==='Popolari'||category==='Tutti'||tool.category===category)&&(!query||[tool.name,tool.description,custom[tool.id]?.[0]].join(' ').toLocaleLowerCase('it').includes(query)));
    const grid=home.querySelector('.home-grid'); grid.replaceChildren();
    for(const tool of list) {
      const card=document.createElement('button'); card.type='button'; card.className='home-tool'; card.dataset.homeTool=tool.id; card.dataset.category=tool.category;
      const art=document.createElement('span'); art.className='home-tool-icon';
      art.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[tool.id]||'M5 3h10l4 4v14H5zM14 3v6h5M8 13h8m-8 4h6'}"/></svg>`;
      const title=document.createElement('h3'); title.textContent=custom[tool.id]?.[0]||tool.name;
      const description=document.createElement('p'); description.textContent=custom[tool.id]?.[1]||tool.description;
      card.append(art,title,description); card.onclick=()=>onTool({...tool,name:title.textContent,description:description.textContent}); grid.append(card);
    }
    home.querySelector('#homeNoResults').hidden=list.length>0;
  }
  home.querySelector('input').oninput=render;
  home.querySelector('#homeUpload').onclick=onUpload; home.querySelector('#homeDemo').onclick=onDemo; home.querySelector('#homeResume').onclick=onResume;
  render(); return home;
}
