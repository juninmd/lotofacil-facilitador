# Laboratório de fórmulas

Gerado por `report.bench.test.ts`. 63 fórmulas de escolha de dezenas testadas em **walk-forward** (cada concurso usa só o passado) de 2738 concursos reais (3738 no histórico, início no 1000º). Sob H0 os acertos têm média 9,00 e desvio 1,22.

**Resultado:** 4 de 63 com p<0,05 (esperado por acaso ≈ 3,2); **nenhuma** sobrevive a Holm-Bonferroni (menor p ajustado = 0,60).

**Seleção fora da amostra:** as 3 melhores da 1ª metade (atraso_relativo, frio_10, ewma_frio_0.9) têm z médio 0,50 na 2ª metade (esperado sob H0: 0).

| Fórmula | Família | Acertos (média) | z | p | p Holm | z 1ª metade | z 2ª metade |
|---|---|---:|---:|---:|---:|---:|---:|
| Frequência no mesmo dia da semana | Calendário | 9,0606 | 2,59 | 0,010 | 0,60 | 1,0 | 2,6 |
| Gap ÷ intervalo médio | Atraso | 9,0522 | 2,23 | 0,026 | 1,00 | 2,0 | 1,1 |
| Borda: EB-1000 + Markov + atraso relativo | Ensemble | 9,0453 | 1,93 | 0,053 | 1,00 | 1,3 | 1,4 |
| Borda: 8 melhores famílias | Ensemble | 9,0453 | 1,93 | 0,053 | 1,00 | 1,1 | 1,7 |
| P(sair | estado anterior) por dezena | Markov | 9,0442 | 1,89 | 0,059 | 1,00 | 0,9 | 1,8 |
| Mais frequentes (janela todo) | Frequência | 9,0409 | 1,75 | 0,081 | 1,00 | 0,0 | 2,4 |
| Beta-binomial (prior 50) | Bayes | 9,0409 | 1,75 | 0,081 | 1,00 | 0,0 | 2,4 |
| Beta-binomial (prior 200) | Bayes | 9,0409 | 1,75 | 0,081 | 1,00 | 0,0 | 2,4 |
| Beta-binomial (prior 1000) | Bayes | 9,0409 | 1,75 | 0,081 | 1,00 | 0,0 | 2,4 |
| Mais frequentes (janela 500) | Frequência | 9,0402 | 1,72 | 0,086 | 1,00 | 0,7 | 1,7 |
| Lift de pares (último → próximo) | Pares | 9,0321 | 1,37 | 0,170 | 1,00 | -0,6 | 2,6 |
| EWMA frio λ=0.9 | Decaimento | 9,0292 | 1,25 | 0,212 | 1,00 | 1,5 | 0,2 |
| Menos frequentes (janela 10) | Frequência | 9,0289 | 1,23 | 0,218 | 1,00 | 1,6 | 0,1 |
| Menos frequentes (janela 5) | Frequência | 9,0274 | 1,17 | 0,242 | 1,00 | 0,7 | 1,0 |
| Regressão logística online (SGD) | Aprendizado | 9,0248 | 1,06 | 0,289 | 1,00 | 0,4 | 1,1 |
| Mais frequentes (janela 100) | Frequência | 9,0237 | 1,01 | 0,310 | 1,00 | 1,2 | 0,2 |
| Mais frequentes (janela 50) | Frequência | 9,0234 | 1,00 | 0,318 | 1,00 | 0,8 | 0,7 |
| Faltam para fechar o ciclo | Ciclo | 9,0194 | 0,83 | 0,408 | 1,00 | -0,2 | 1,3 |
| Só baixas | Números fixos | 9,0117 | 0,50 | 0,618 | 1,00 | -1,0 | 1,7 |
| KNN (k=20) por Jaccard do último sorteio | Vizinhos | 9,0106 | 0,45 | 0,651 | 1,00 | 0,9 | -0,3 |
| EWMA quente λ=0.995 | Decaimento | 9,0102 | 0,44 | 0,662 | 1,00 | 0,9 | -0,3 |
| EWMA quente λ=0.99 | Decaimento | 9,0095 | 0,41 | 0,685 | 1,00 | 1,1 | -0,5 |
| Mais frequentes (janela 200) | Frequência | 9,0080 | 0,34 | 0,731 | 1,00 | 0,2 | 0,3 |
| Só moldura | Números fixos | 9,0069 | 0,30 | 0,767 | 1,00 | -0,7 | 1,1 |
| Últimas bolas do concurso anterior | Ordem | 9,0037 | 0,16 | 0,876 | 1,00 | -0,7 | 0,9 |
| Só fibonacci | Números fixos | 9,0037 | 0,16 | 0,876 | 1,00 | -1,3 | 1,5 |
| Menos frequentes (janela 20) | Frequência | 9,0026 | 0,11 | 0,913 | 1,00 | 0,1 | 0,1 |
| Menos frequentes (janela 200) | Frequência | 9,0004 | 0,02 | 0,988 | 1,00 | -0,3 | 0,3 |
| Mais frequentes (janela 30) | Frequência | 8,9993 | -0,03 | 0,975 | 1,00 | 0,7 | -0,8 |
| Aleatório (controle 3) | Controle | 8,9971 | -0,12 | 0,901 | 1,00 | -0,3 | 0,1 |
| EWMA quente λ=0.98 | Decaimento | 8,9934 | -0,28 | 0,779 | 1,00 | -0,4 | -0,0 |
| Mais frequentes (janela 5) | Frequência | 8,9923 | -0,33 | 0,743 | 1,00 | -1,3 | 0,8 |
| Dezenas de 2 concursos atrás | Repetição | 8,9923 | -0,33 | 0,743 | 1,00 | -1,6 | 1,1 |
| Soma dos 3 últimos concursos | Repetição | 8,9920 | -0,34 | 0,731 | 1,00 | -0,5 | 0,0 |
| Aleatório (controle 2) | Controle | 8,9912 | -0,37 | 0,708 | 1,00 | 0,4 | -1,0 |
| Mais frequentes (janela 20) | Frequência | 8,9909 | -0,39 | 0,696 | 1,00 | -0,5 | -0,1 |
| Menos frequentes (janela 30) | Frequência | 8,9905 | -0,41 | 0,685 | 1,00 | 0,3 | -0,9 |
| EWMA quente λ=0.9 | Decaimento | 8,9901 | -0,42 | 0,674 | 1,00 | -1,1 | 0,5 |
| Freq(20) − Freq(200) (aceleração) | Mistas | 8,9901 | -0,42 | 0,674 | 1,00 | -0,4 | -0,2 |
| Só multiplos3 | Números fixos | 8,9879 | -0,51 | 0,607 | 1,00 | -2,2 | 1,5 |
| Borda: logit + hazard + KNN-100 | Ensemble | 8,9876 | -0,53 | 0,596 | 1,00 | -0,4 | -0,4 |
| Saíram há pouco (menor gap) | Atraso | 8,9861 | -0,59 | 0,553 | 1,00 | -1,0 | 0,2 |
| Dezenas do concurso anterior | Repetição | 8,9861 | -0,59 | 0,553 | 1,00 | -1,0 | 0,2 |
| EWMA quente λ=0.95 | Decaimento | 8,9858 | -0,61 | 0,543 | 1,00 | -1,1 | 0,3 |
| Mais atrasadas (gap) | Atraso | 8,9847 | -0,66 | 0,512 | 1,00 | -0,9 | 0,0 |
| Fora do concurso anterior | Repetição | 8,9847 | -0,66 | 0,512 | 1,00 | -0,9 | 0,0 |
| EWMA frio λ=0.98 | Decaimento | 8,9832 | -0,72 | 0,473 | 1,00 | 0,4 | -1,4 |
| Hazard empírico por tamanho do atraso | Atraso | 8,9825 | -0,75 | 0,454 | 1,00 | -0,8 | -0,2 |
| EWMA frio λ=0.95 | Decaimento | 8,9821 | -0,76 | 0,445 | 1,00 | 0,1 | -1,1 |
| EWMA frio λ=0.99 | Decaimento | 8,9817 | -0,78 | 0,435 | 1,00 | -0,1 | -1,0 |
| Aleatório (controle 1) | Controle | 8,9814 | -0,80 | 0,426 | 1,00 | -1,0 | -0,2 |
| Menos frequentes (janela 50) | Frequência | 8,9799 | -0,86 | 0,391 | 1,00 | -0,4 | -0,8 |
| 50% quente(50) + 50% frio(500) | Mistas | 8,9795 | -0,87 | 0,382 | 1,00 | -0,5 | -0,8 |
| Só impares | Números fixos | 8,9792 | -0,89 | 0,374 | 1,00 | -1,5 | 0,2 |
| Menos frequentes (janela 100) | Frequência | 8,9748 | -1,08 | 0,282 | 1,00 | -1,0 | -0,5 |
| Vizinhos (grade 5x5) do último sorteio | Volante | 8,9744 | -1,09 | 0,275 | 1,00 | 0,7 | -2,2 |
| Primeiras bolas do concurso anterior | Ordem | 8,9690 | -1,33 | 0,185 | 1,00 | -2,4 | 0,5 |
| Só primos | Números fixos | 8,9635 | -1,56 | 0,119 | 1,00 | -1,2 | -1,0 |
| KNN (k=100) por Jaccard do último sorteio | Vizinhos | 8,9565 | -1,86 | 0,063 | 1,00 | -2,0 | -0,6 |
| EWMA frio λ=0.995 | Decaimento | 8,9562 | -1,87 | 0,061 | 1,00 | -1,5 | -1,1 |
| Menos frequentes (janela 500) | Frequência | 8,9558 | -1,89 | 0,059 | 1,00 | -1,1 | -1,5 |
| Menos frequentes (janela todo) | Frequência | 8,9438 | -2,40 | 0,016 | 0,99 | -0,8 | -2,6 |
| Mais frequentes (janela 10) | Frequência | 8,9408 | -2,53 | 0,011 | 0,71 | -2,1 | -1,4 |

## Construção de portfólio (mesmo custo)

200 mil sorteios inéditos, média de 3 sementes. REA = retorno esperado ajustado (R$ por aposta de R$ 3,50; fórmula em `expectedReturn.ts`).

### 10 jogos (R$ 35,00)

| Método | P(≥11) | P(≥12) | P(≥13) | P(≥14) | Multidão | REA |
|---|---:|---:|---:|---:|---:|---:|
| Aleatório | 67,5% | 16,8% | 1,47% | 0,045% | 0,96 | 1,146 |
| Rotação cíclica | 56,8% | 13,5% | 1,33% | 0,043% | 3,05 | 0,914 |
| Balanceado (cada dezena igual) | 71,9% | 17,1% | 1,49% | 0,049% | 0,94 | 1,151 |
| Guloso mín. sobreposição | 75,8% | 17,7% | 1,48% | 0,045% | 1,00 | 1,131 |
| Sorteio dentro de pool de 18 | 36,5% | 9,5% | 1,10% | 0,037% | 0,93 | 1,155 |
| Monte Carlo (cobertura) | 77,4% | 17,9% | 1,48% | 0,050% | 0,92 | 1,158 |
| Monte Carlo (placar por faixa) | 77,7% | 18,0% | 1,50% | 0,044% | 1,01 | 1,129 |
| Monte Carlo + menos disputados | 77,2% | 17,8% | 1,46% | 0,048% | 0,79 | 1,205 |

### 16 jogos (R$ 56,00)

| Método | P(≥11) | P(≥12) | P(≥13) | P(≥14) | Multidão | REA |
|---|---:|---:|---:|---:|---:|---:|
| Aleatório | 84,0% | 25,5% | 2,34% | 0,074% | 0,96 | 1,145 |
| Rotação cíclica | 66,7% | 17,5% | 1,85% | 0,061% | 2,97 | 0,917 |
| Balanceado (cada dezena igual) | 86,3% | 25,7% | 2,35% | 0,073% | 0,93 | 1,153 |
| Guloso mín. sobreposição | 90,7% | 27,2% | 2,38% | 0,073% | 1,00 | 1,134 |
| Sorteio dentro de pool de 18 | 42,3% | 12,2% | 1,55% | 0,059% | 0,93 | 1,153 |
| Monte Carlo (cobertura) | 92,3% | 27,9% | 2,39% | 0,075% | 0,98 | 1,138 |
| Monte Carlo (placar por faixa) | 91,8% | 27,7% | 2,43% | 0,071% | 1,01 | 1,128 |
| Monte Carlo + menos disputados | 91,9% | 27,6% | 2,38% | 0,070% | 0,80 | 1,204 |

## Retorno esperado por aposta (REA)

Calibrado nos últimos 1000 concursos: pool do jackpot ≈ R$ 2.671.205, 3,02 co-ganhadores esperados, fator de acúmulo 1,42.

| Situação | Multidão | Acumulados | R$/aposta | Retorno |
|---|---:|---:|---:|---:|
| Jogo típico | 1,00 | 0 | 1,132 | -67,6% |
| Menos disputado | 0,78 | 0 | 1,210 | -65,4% |
| Típico, após 1 acúmulo | 1,00 | 1 | 1,498 | -57,2% |
| Menos disputado, após 1 acúmulo | 0,78 | 1 | 1,656 | -52,7% |

Nenhuma situação chega a retorno positivo. 63 fórmulas + 8 métodos de portfólio testados.
