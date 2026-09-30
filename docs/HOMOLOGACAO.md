# Homologação do motor Monte Carlo

Reprodutível: `pnpm test src/utils/mc` (sementes fixas, ~10 s, roda no CI).

## O que foi validado

| # | Afirmação | Teste | Resultado |
|---|---|---|---|
| H1 | O simulador reproduz a matemática exata | P(≥11/12/13) de apostas de 15/16/17 dezenas vs hipergeométrica; χ² da distribuição de acertos | dentro de 4,5σ; ex.: 16 dezenas 22,13% (MC) vs 22,16% (exato) |
| H2 | Sorteios simulados são uniformes | χ² (24 GL) das frequências | passa |
| H2b | Sorteios reais (3.738 concursos) não têm edge explorável | Walk-forward "top 15 por frequência" a partir do concurso 1000 | 9,041 acertos (teoria 9,00; IC95% ±0,046) → sem vantagem |
| H3 | Otimizador supera aleatório **fora da amostra** | 150 mil sorteios inéditos, 3 baselines aleatórios | ≥ +4 pp (5/10 jogos), ≥ +2,5 pp (20) |
| H3b | Retorno esperado não muda (linearidade) | prêmio esperado otimizado vs aleatório | equivalentes |
| H4 | Modelo de multidão prevê fora da amostra | Treino em 60/70/80% do histórico, teste no restante, quartil menos vs mais disputado | mais disputado tem ≥ 15% mais co-ganhadores no 14 (hold-out 70%: 0,397 vs 0,663 por volume, ~40%) |
| H5 | Plano completo com dados reais | restrição de multidão, custo, aposta múltipla | ok |

## Ganho medido (300 mil sorteios inéditos, semente 11)

Chance de **pelo menos um prêmio (≥ 11 acertos)** com jogos de 15 dezenas:

| Jogos | Custo | Aleatório | Otimizado | Otimizado + menos disputados | Popularidade média* |
|---:|---:|---:|---:|---:|---:|
| 3 | R$ 10,50 | 28,8% | 31,0% | 31,5% | 0,76 |
| 5 | R$ 17,50 | 43,5% | 49,4% | 48,6% | 0,77 |
| 10 | R$ 35 | 67,1% | 77,4% | 77,7% | 0,81 |
| 16 | R$ 56 | 82,5% | 92,2% | 92,1% | 0,76 |
| 20 | R$ 70 | 89,8% | 96,1% | 95,5% | 0,81 |
| 30 | R$ 105 | 96,3% | 99,1% | 99,1% | 0,80 |

\* 1,00 = jogo típico; 0,80 ≈ 20% menos co-ganhadores previstos ao dividir 14/15 acertos.
Evitar jogos populares custa ≤ 0,8 pp de cobertura e reduz a popularidade em ~15–45%.

## Limites (o que NÃO foi, nem pode ser, provado)

- Nenhum método altera P(14) ou P(15) por jogo: o sorteio é uniforme e independente.
- Retorno esperado por real apostado permanece ≈ −57%.
- O otimizador platôa: mais iterações/sorteios de treino não melhoram fora da amostra (superajuste).
- Espalhar jogos maximiza a chance de ganhar **algo em todas as faixas**. A aposta múltipla (16+ dezenas) tem o mesmo retorno esperado, mas agrupa prêmios em eventos raros (um acerto gera vários prêmios simultâneos). Mesmo custo de 16 jogos: P(≥11) 92% vs 22%; P(≥14) 0,071% vs 0,029% (300 mil sorteios).
- Desvio in-sample nas frequências reais (χ² p≈1e-4, dezena 16 a −3,6σ) não se sustenta fora da amostra.
