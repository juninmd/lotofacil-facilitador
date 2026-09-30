# Perícia estatística do histórico da Lotofácil

Pergunta: **existe alguma regra escondida nos 3.738 concursos (2003–2026)?** Testamos de forma exaustiva, com
p-valores exatos por Monte Carlo (1.000 "mundos" uniformes com as mesmas datas; 200 nos testes pesados) e correção de
Bonferroni sobre os 47 testes. Reprodutível: `battery.bench.test.ts` e `power.bench.test.ts`
(`npx vitest run --config vitest.backtest.config.ts src/utils/forensics`).

## Conclusão

1. **Existe estrutura real — mas pequena.** A frequência das dezenas **não é perfeitamente uniforme**: é o único teste que
   sobrevive a Bonferroni (p=0,001; ajustado 0,047). O desvio verdadeiro tem desvio-padrão ≈ **1 pp** (as dezenas ficam entre
   ~58% e ~61,5%, não todas em 60%).
2. **Ele é persistente, logo previsível.** Correlação dos desvios por dezena entre 1ª e 2ª metade do histórico: **0,48**
   (p=0,0075); média entre blocos contíguos: p=0,0025. Fora da amostra (concursos 2000+), o estimador VPE ganha
   log-verossimilhança (z≈2,5 a 3,3) e faz **9,06–9,08 acertos** (vs 9,00).
3. **É só isso.** Nada mais aparece: pares, trios, dependência entre concursos (lags 1 e 2, todas as dezenas), autocorrelação
   de cada dezena, ordem de saída das bolas (posição, sucessor, 1ª bola), calendário (dia da semana, mês, dia do mês, ano,
   resto do nº do concurso 2–13), espectro (periodicidade), somas/consecutivos/ímpares/primos, repetição do concurso
   anterior e quase-duplicatas — todos compatíveis com sorteio uniforme.
4. **Um modelo grande de aprendizado não acha nada além disso**: regressão logística por dezena com lags de todas as
   dezenas, frequências, atraso e dia da semana perde para a frequência histórica em log-verossimilhança (validação temporal).
5. **Teto.** Conhecendo o viés exatamente, o ganho máximo seria ≈ **+0,09 acertos/concurso**; estimado com ruído, ≈ +0,05 a
   +0,08. É a fórmula "escondida" que os dados sustentam. Não muda a ordem de grandeza das chances (P(15) continua ≈ 1 em 3,3
   milhões), mas é real e o app já a usa (fórmula **VPE**, aba Monte Carlo e gerador).

## A fórmula VPE (Viés Persistente Encolhido)

```
f_n   = frequência (ponderada) da dezena n no passado
σ_b²  = max(var_entre_dezenas(f) − 0,24/n_ef, ε)      viés verdadeiro
s     = σ_b² / (σ_b² + 0,24/n_ef)                       confiança (0 a 1)
p̂_n   = 0,6 + s·(f_n − 0,6)
```
Sem hiperparâmetros. As 15 dezenas de maior p̂ são o melhor jogo único; no portfólio, p̂ define a distribuição usada pelo
otimizador Monte Carlo (sorteios de treino ponderados).

Validação em **1.738 concursos reais** (walk-forward, estimador só com o passado; concursos 2000+):

| Método | Acertos/jogo | P(≥11) | Δ vs aleatório (pareado) |
|---|---:|---:|---:|
| 1 jogo aleatório | 9,009 | 9,7% | — |
| 1 jogo VPE (top-15) | 9,058 | 10,8% | +0,05 acertos (z=1,2); +1,09 pp (z=1,1) |
| 10 jogos aleatórios | 9,005 | 67,8% | — |
| 10 jogos Monte Carlo uniforme | 8,996 | 77,1% | +9,3 pp (z=6,1) |
| 10 jogos Monte Carlo + VPE | 9,001 | **78,1%** | +10,4 pp (z=6,8) |

Cada linha isolada tem pouco poder (o efeito é pequeno); a evidência forte vem do conjunto: persistência entre períodos,
verossimilhança preditiva e o teste de poder abaixo.

## Poder: "se o viés fosse X, nós o veríamos?"

Mundos sintéticos do mesmo tamanho (3.738 concursos) com viés injetado de tamanho conhecido:

| σ do viés injetado | p (freq χ²) | ganho oráculo (acertos) | VPE: z fora da amostra | VPE: acertos (top-15) |
|---:|---:|---:|---:|---:|
| 0,00 pp | 0,967 | 0,059 | -1,77 | 8,975 |
| 0,61 pp | 0,050 | 0,101 | 0,11 | 9,030 |
| 1,13 pp | 0,003 | 0,138 | 1,45 | 9,089 |
| 2,26 pp | 0,003 | 0,241 | 4,71 | 9,215 |
| 4,08 pp | 0,003 | 0,441 | 7,23 | 9,418 |

Modelo grande (regressão logística por dezena com lags 1-10 de todas as dezenas, frequências, atraso e dia da semana), validação temporal em 2238 concursos: Δ log-loss vs frequência histórica = -0,145 por concurso (negativo = pior), acertos 9,038 (z=1,45).

O mundo com σ≈1,1 pp reproduz o que vimos nos dados reais (χ² p≈0,003; VPE ≈ 9,09 acertos): **os dados reais se
comportam como um sorteio com viés de ~1 pp por dezena**. Vieses menores que ~0,5 pp são invisíveis com este volume de dados
(e valeriam < 0,03 acertos). A coluna "ganho oráculo" inclui ~0,06 de viés de seleção em amostra (aparece até com viés zero).

## Bateria completa

Estatística grande = mais extremo. p = fração de mundos uniformes com estatística ≥ observada (+1).

| Teste | Estatística | p (Monte Carlo) | p Bonferroni |
|---|---:|---:|---:|
| freq:chi2 | 61,54 | 0,0010 (1000 mundos) | 0,047 |
| freq:max|z| | 3,57 | 0,0080 (1000 mundos) | 0,376 |
| deriva:CUSUM sup | 3,63 | 0,0080 (1000 mundos) | 0,376 |
| dist:soma | 112,06 | 0,0220 (1000 mundos) | 1,000 |
| cruzado lag2|freq:chi2 | 174,85 | 0,0240 (1000 mundos) | 1,000 |
| quase-duplicatas(>=14 em comum) | 348,00 | 0,0547 (200 mundos) | 1,000 |
| calendário:ano | 594,48 | 0,0919 (1000 mundos) | 1,000 |
| dist:consecutivos | 12,56 | 0,1199 (1000 mundos) | 1,000 |
| calendário:dia da semana | 143,50 | 0,1269 (1000 mundos) | 1,000 |
| calendário:nº concurso mod 3 | 62,21 | 0,1299 (1000 mundos) | 1,000 |
| calendário:mês | 297,41 | 0,1888 (1000 mundos) | 1,000 |
| dist:baixas | 10,76 | 0,2218 (1000 mundos) | 1,000 |
| calendário:dia do mês | 765,76 | 0,3347 (1000 mundos) | 1,000 |
| calendário:nº concurso mod 12 | 284,77 | 0,3347 (1000 mundos) | 1,000 |
| lag(n→n):chi2 | 308,91 | 0,3566 (1000 mundos) | 1,000 |
| calendário:nº concurso mod 5 | 103,45 | 0,3786 (1000 mundos) | 1,000 |
| dist:maior_linha | 2,01 | 0,3806 (1000 mundos) | 1,000 |
| dist:repetidos_do_anterior | 8,51 | 0,3866 (1000 mundos) | 1,000 |
| ordem:posição×dezena chi2 | 367,13 | 0,4016 (1000 mundos) | 1,000 |
| calendário:nº concurso mod 6 | 128,04 | 0,4346 (1000 mundos) | 1,000 |
| calendário:nº concurso mod 11 | 250,59 | 0,4885 (1000 mundos) | 1,000 |
| dist:primos | 7,01 | 0,5325 (1000 mundos) | 1,000 |
| cruzado lag1|freq:max|z| | 1,60 | 0,5415 (1000 mundos) | 1,000 |
| espectro:g de Fisher máx | 0,01 | 0,5564 (1000 mundos) | 1,000 |
| calendário:nº concurso mod 7 | 146,20 | 0,5714 (1000 mundos) | 1,000 |
| pares|freq:max|z| | 1,50 | 0,5724 (1000 mundos) | 1,000 |
| ordem:sucessor chi2 | 578,00 | 0,5784 (1000 mundos) | 1,000 |
| lag(n→n):max|z| | 2,97 | 0,5854 (1000 mundos) | 1,000 |
| dist:maior_coluna | 1,08 | 0,6074 (1000 mundos) | 1,000 |
| cruzado lag2|freq:max|z| | 1,58 | 0,6154 (1000 mundos) | 1,000 |
| serial:consecutivos | 1,33 | 0,6274 (1000 mundos) | 1,000 |
| dist:amplitude | 5,49 | 0,6983 (1000 mundos) | 1,000 |
| calendário:nº concurso mod 8 | 163,57 | 0,7063 (1000 mundos) | 1,000 |
| calendário:nº concurso mod 9 | 187,87 | 0,7143 (1000 mundos) | 1,000 |
| calendário:nº concurso mod 4 | 66,11 | 0,7403 (1000 mundos) | 1,000 |
| ordem:1ª bola vs 1ª anterior chi2 | 597,19 | 0,7622 (1000 mundos) | 1,000 |
| calendário:nº concurso mod 2 | 18,22 | 0,8252 (1000 mundos) | 1,000 |
| pares|freq:chi2 | 69,72 | 0,8332 (1000 mundos) | 1,000 |
| cruzado lag1|freq:chi2 | 146,66 | 0,8521 (1000 mundos) | 1,000 |
| calendário:nº concurso mod 10 | 200,80 | 0,8561 (1000 mundos) | 1,000 |
| dist:maior_salto | 3,40 | 0,8611 (1000 mundos) | 1,000 |
| deriva:tendência max|z| | 1,71 | 0,8901 (1000 mundos) | 1,000 |
| serial:soma | 0,86 | 0,9181 (1000 mundos) | 1,000 |
| serial:impares | 0,85 | 0,9211 (1000 mundos) | 1,000 |
| calendário:nº concurso mod 13 | 254,01 | 0,9730 (1000 mundos) | 1,000 |
| trios|freq:max|z| | 2,11 | 0,9801 (200 mundos) | 1,000 |
| dist:impares | 1,85 | 0,9890 (1000 mundos) | 1,000 |

## O que isso NÃO significa

- Não há fórmula que preveja o próximo concurso: o efeito máximo é ≈ +0,09 acertos em 9.
- O retorno esperado por real continua negativo (≈ −57% a −65%).
- O viés pode mudar (bolas trocadas/desgaste): por isso o modelo é re-estimado com o histórico atualizado
  (`pnpm data:update`) e o encolhimento é automático.
