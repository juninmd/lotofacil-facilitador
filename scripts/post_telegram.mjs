// Posta o resumo do benchmark da Lotofácil no Telegram.
//
// SEGURANÇA: nenhum segredo no código. Credenciais vêm de variáveis de ambiente:
//   TELEGRAM_BOT_TOKEN  -> token do seu bot (via @BotFather)
//   TELEGRAM_CHAT_ID    -> id do chat/canal de destino
//
// Uso (PowerShell):
//   $env:TELEGRAM_BOT_TOKEN="123:ABC"; $env:TELEGRAM_CHAT_ID="123456"; \
//   npm run test:backtest; node scripts/post_telegram.mjs
//
// Requer bench-report.json (gerado por megabench.bench.test.ts).

import { readFileSync } from 'node:fs';

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!token || !chatId) {
  console.error('ERRO: defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID no ambiente.');
  process.exit(1);
}

let report;
try {
  report = JSON.parse(readFileSync('bench-report.json', 'utf8'));
} catch {
  console.error('ERRO: bench-report.json não encontrado. Rode `npm run test:backtest` antes.');
  process.exit(1);
}

const md = (s) => String(s).replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');

const tradeoff = report.tradeoffDezenas
  .map((t) => `\`${t.dezenas}\` dez | E=${t.E_acertos} | P≥14=${(t['P>=14'] * 100).toFixed(3)}% | R$${t.custoR$}`)
  .join('\n');

const topStrats = report.estrategias
  .slice(0, 5)
  .map((s, i) => `${i + 1}. ${s.estrategia}: ${s.mediaAcertos} acertos/jogo`)
  .join('\n');

const text = md(
  `🎰 *Homologação Lotofácil* (concurso ${report.ultimoConcurso}, ${report.jogosAnalisados} jogos)\n\n` +
    `📊 *A verdade matemática*: a Lotofácil é sorteio uniforme. Nenhuma estratégia PREVÊ resultado — todas empatam na esperança de 9,0 acertos ao marcar 15 dezenas.\n\n` +
    `*Top 5 estratégias (cartela de 15):*\n${topStrats}\n\n` +
    `✅ *A ÚNICA forma real de acertar mais números* = marcar mais dezenas (custo × probabilidade):\n${tradeoff}\n\n` +
    `🧮 Desdobramento garante acertos mínimos de forma matemática (não por sorte).\n` +
    `⚠️ Jogue com responsabilidade: aposta é entretenimento, não investimento.`,
);

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2' }),
});

const body = await res.json();
if (!res.ok || !body.ok) {
  console.error('Falha ao postar:', body);
  process.exit(1);
}
console.log('Postado no Telegram com sucesso. message_id:', body.result?.message_id);
