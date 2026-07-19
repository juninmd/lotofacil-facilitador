// Baixa TODO o histórico da Lotofácil e salva em src/data/lotofacil-history.json
// (versionado), para o app/bench não precisarem consultar a API o tempo todo.
//
// Uso:  node scripts/fetch_history.mjs
//
// Fontes (em ordem): API comunitária (bulk, 1 requisição) -> Caixa (por concurso).
// Assim, se o IP for bloqueado numa fonte, tentamos a outra.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const OUT = 'src/data/lotofacil-history.json';
const BULK = 'https://loteriascaixa-api.herokuapp.com/api/lotofacil';
const CAIXA = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil';
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Normaliza um registro (de qualquer fonte) para o formato do app.
const normalize = (d) => ({
  numero: Number(d.concurso ?? d.numero),
  listaDezenas: (d.dezenas ?? d.listaDezenas ?? []).map(Number).sort((a, b) => a - b),
  dataApuracao: d.data ?? d.dataApuracao ?? '',
  listaRateioPremio: (d.premiacoes ?? d.listaRateioPremio ?? []).map((p) => ({
    faixa: p.faixa,
    numeroDeGanhadores: p.ganhadores ?? p.numeroDeGanhadores ?? 0,
    valorPremio: p.valorPremio ?? 0,
    descricaoFaixa: p.descricao ?? p.descricaoFaixa ?? '',
  })),
});

const fromBulk = async () => {
  console.log(`Fonte 1 (bulk): ${BULK}`);
  const r = await fetch(BULK, { headers: HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const arr = await r.json();
  if (!Array.isArray(arr) || arr.length === 0) throw new Error('resposta vazia');
  return arr.map(normalize).filter((g) => g.numero && g.listaDezenas.length === 15);
};

const fromCaixa = async () => {
  console.log(`Fonte 2 (Caixa, por concurso): ${CAIXA}`);
  const r0 = await fetch(`${CAIXA}/`, { headers: HEADERS });
  if (!r0.ok) throw new Error(`HTTP ${r0.status} (latest)`);
  const latest = normalize(await r0.json());
  const games = [latest];
  let consecutiveFailures = 0;
  for (let n = latest.numero - 1; n >= 1; n--) {
    try {
      const r = await fetch(`${CAIXA}/${n}`, { headers: HEADERS });
      if (r.ok) {
        games.push(normalize(await r.json()));
        consecutiveFailures = 0;
      } else {
        consecutiveFailures++;
      }
    } catch {
      consecutiveFailures++;
    }
    if (consecutiveFailures > 20) {
      throw new Error('Muitas falhas consecutivas na Caixa. Abortando.');
    }
    if (n % 5 === 0) await sleep(120);
    if (n % 100 === 0) process.stdout.write(`  ${n}...\n`);
  }
  return games;
};

const run = async () => {
  let games;
  try {
    games = await fromBulk();
  } catch (e) {
    console.warn(`  bulk falhou: ${e.message}`);
    games = await fromCaixa();
  }
  games.sort((a, b) => b.numero - a.numero); // mais novo primeiro
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(games));
  console.log(`OK: ${games.length} concursos salvos em ${OUT} (nº ${games[games.length - 1].numero}–${games[0].numero}).`);
};

run().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});