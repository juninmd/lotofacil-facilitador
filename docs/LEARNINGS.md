# Aprendizados: o que fazer e o que não fazer

> **Regra de ouro:** Estatística existe pra dizer o possível, a matemática para fazer o impossível.

Diário das rodadas semanais de benchmark. **Leia tudo antes de começar uma rodada** e acrescente uma seção nova no fim.
Relatórios completos em [`docs/benchmarks/`](benchmarks/). Contexto: [`FORENSE.md`](FORENSE.md).

## Regras que já se provaram (não quebre)

1. **Sem lookahead.** O gerador só vê concursos anteriores ao alvo. O VPE do app lê o JSON completo; no benchmark ele é
   recalculado só com o passado (`vpePick` em `src/utils/weekly/contenders.ts`).
2. **Duas metades.** Uma ideia só vira padrão com z ≥ 2 no total **e** z ≥ 1 na metade antiga **e** na recente.
   Testar 10 variantes e pegar a melhor numa amostra só é sobreajuste garantido (ver rodada 1).
3. **Poder estatístico.** Com 300 alvos o erro-padrão da média é ±0,07 acerto; o maior efeito real conhecido é +0,08.
   Rodada curta serve para achar **bugs** e regressões; vantagem real só se mede na rodada longa (≈1.700 alvos).
4. **Semente fixa.** `Math.random` é semeado por alvo: relatórios são comparáveis semana a semana.

## Rodada 1 (2026-11-22), base até o concurso 3738

**Funcionou**
- **VPE com o histórico todo** é o único gerador com vantagem consistente: 9,076 acertos/jogo em 1.738 alvos
  (z = 2,59; metades 1,91 e 1,74), P(≥11) 11,6% vs 10,8% do aleatório. Segue como recomendado.
- **Bug corrigido:** Random Forest, Gradient Boosting e XGBoost exigiam ≥120 concursos, mas o app entrega 100, então
  **sempre devolviam 1..15** (um jogo fixo). Agora a janela de treino se adapta (`src/utils/mlWindow.ts`) e o fallback
  usa frequência.

**Falhou (não repita sem ideia nova)**
- **Recência/decaimento no VPE** (λ = 0,9999 a 0,99), **janela 500**, **janela 100**, "frio" (menos saídos),
  repetir/evitar o último concurso, e misturas VPE + recente/último. Pareciam ótimos na 1ª metade
  (λ=0,999: z=+3,4) e somem na 2ª (z=−0,4). Clássico sobreajuste. O viés é **persistente e de longo prazo**.
- **Todos os geradores de janela 100 do app** (smart, consenso, KNN, Markov, bayesiana, genético, Q-learning, regressão,
  RF, GBDT, XGBoost, padrões, pares): todos dentro de ±1,2 z do acaso em 300 alvos. Com 100 concursos não dá para ver
  um viés de ~1 pp (ruído de ~5 pp por dezena).
- Max15 deu z=1,41 (sinal fraco) em 300 alvos: tratar como provável sorte até repetir em outra rodada.
- MLP, LSTM e Bi-LSTM são lentos demais (4 a 50 s por palpite) para ter poder; não dá para validá-los assim.

**Observações**
- Retorno com rateio real ≈ R$ 0,22 a 0,27 por R$ 1 apostado nas faixas 11–13 (sem contar raros 14/15).
- A rede do ambiente de nuvem bloqueia as APIs da loteria: a base não foi atualizada nesta rodada.

**Próximos passos (rodada 2)**
1. Dar aos geradores de ML o histórico todo (ou features de longo prazo como a frequência de VPE) e medir na rodada longa.
2. Prêmio, não só acertos: usar o nº de ganhadores do rateio para estimar dezenas populares e evitar dividir prêmio
   (eleva o retorno R$/R$ mesmo com os mesmos acertos).
3. Portfólio: medir 10 jogos VPE + cobertura (Monte Carlo) contra 10 aleatórios em P(≥11) e P(≥13).
4. Repetir Max15 na rodada longa para confirmar ou descartar.
