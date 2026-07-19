# Lotofácil Facilitador

Este projeto é uma aplicação web desenvolvida para auxiliar na geração e análise de números para a Lotofácil. Ele oferece ferramentas para facilitar a escolha de dezenas, aumentando as chances de sucesso.

## Tecnologias Utilizadas

*   **React**: Biblioteca JavaScript para construção de interfaces de usuário.
*   **TypeScript**: Superset de JavaScript que adiciona tipagem estática.
*   **Vite**: Ferramenta de build rápida para projetos web modernos.
*   **Tailwind CSS**: Framework CSS utilitário para estilização rápida e responsiva.
*   **pnpm**: Gerenciador de pacotes rápido e eficiente.

## Como Rodar o Projeto

Para configurar e rodar o projeto localmente, siga os passos abaixo:

### Pré-requisitos

Certifique-se de ter o Node.js (versão 18 ou superior) e o pnpm instalados em sua máquina.

### Instalação

1.  Clone este repositório:
    ```bash
    git clone https://github.com/juninmd/lotofacil-facilitador.git
    ```
2.  Navegue até o diretório do projeto:
    ```bash
    cd lotofacil-facilitador
    ```
3.  Instale as dependências usando pnpm:
    ```bash
    pnpm install
    ```

### Execução

Para iniciar o servidor de desenvolvimento:

```bash
pnpm dev
```

O aplicativo estará disponível em `http://localhost:5173` (ou outra porta disponível).

## Funcionalidades (Exemplos)

*   Geração de combinações aleatórias.
*   Seleção manual de dezenas.
*   Análise de padrões (pares/ímpares, repetidos, etc.).
*   Histórico de jogos.

## Homologação & Testes

O projeto usa **vitest**. Testes cobrem invariantes dos 14 geradores, funções
estatísticas puras, probabilidade exata (hipergeométrica) e desdobramento.

```bash
pnpm test            # suite determinística (entra no CI)
pnpm test:coverage   # relatório de cobertura
pnpm test:backtest   # backtest + mega-benchmark com dados REAIS da Caixa (fora do CI)
```

## A verdade matemática (leia antes de apostar)

A Lotofácil sorteia 15 de 25 dezenas de forma **uniforme e independente**. O
benchmark com dados reais (`pnpm test:backtest`) comprova:

- **Prever não funciona.** Todas as estratégias (heurística, Markov, ML, ensemble)
  e até a aposta aleatória empatam na esperança de **9,0 acertos** ao marcar 15
  dezenas. Sorteios passados não influenciam os futuros.
- **A única forma real de acertar mais números** é marcar mais dezenas — o que
  aumenta a probabilidade de forma exata, ao custo de mais combinações:

  | Dezenas | Esperança | P(≥14) | Custo (combinações × R$3,50) |
  |---:|---:|---:|---:|
  | 15 | 9,0 | ~0,03% | R$ 3,50 (1) |
  | 16 | 9,6 | maior | R$ 56 (16) |
  | 18 | 10,8 | maior | R$ 2.856 (816) |
  | 20 | 12,0 | maior | R$ 54.264 (15.504) |

- **Desdobramento** (wheeling) garante um número mínimo de acertos de forma
  **matemática** (não por sorte), distribuindo um pool em vários jogos.

⚠️ Aposta é entretenimento, não investimento. Jogue com responsabilidade.

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## Licença

Este projeto está licenciado sob a licença MIT.
