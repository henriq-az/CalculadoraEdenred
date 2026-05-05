# Prompt: ScoreCard com Árvore que Cresce

## Contexto do Projeto

Este é um painel de sustentabilidade (`Dashboard.jsx`) para uma empresa chamada Edenred.
O backend Java retorna um objeto `ScoreDTO` com os seguintes campos:

```json
{
  "score": 62.0,
  "label": "Broto",
  "actualCO2": 1500.0,
  "baselineCO2": 5000.0,
  "co2Saved": 12400.0,
  "totalTransactions": 184,
  "digitalTransactions": 135,
  "startDate": "2026-05-01",
  "endDate": "2026-05-05"
}
```

O componente `ScoreCard` recebe esse objeto como prop `score` (ou `null` se não houver dados).

---

## Tarefa

Reescreva o componente `ScoreCard.jsx` e `ScoreCard.css` para exibir uma **árvore que cresce** conforme o score do usuário evolui de 0 a 100.

---

## Níveis

| Faixa  | `label` retornado pelo backend | Visual da planta |
|--------|-------------------------------|-----------------|
| 0–33   | Semente                       | Sementinha marrom emergindo da terra |
| 34–66  | Broto                         | Caule verde curvado (S-curve sutil) com 2 pares de folhas em formato de gota |
| 67–100 | Árvore                        | Pinheiro triangular com 3 camadas empilhadas + tronco marrom |

---

## Arte SVG (estilo flat / fintech minimalista)

- SVG geométrico sem photorealismo, traços limpos
- `viewBox="0 0 300 300"` com `overflow: visible`
- Tigela de terra marrom (`#6B4423` → `#4A2E18`) na base de todos os níveis, posicionada em `y=235`
- Sem círculo de fundo — apenas a planta sobre a terra
- Paleta folhas: `#A5D6A7` (claro), `#7BB97D` (médio), `#4F8C5A` (escuro), caule `#5A9A4A`
- Tronco: `#8B5A2B` (claro) / `#6B4423` (escuro)

**Semente**: sementinha marrom com rachadinha verde emergindo da terra, botão verde no topo.

**Broto**: caule fino em S-curve saindo da terra; par inferior de folhas menores e mais escuras, par superior de folhas maiores e mais claras, tudo em formato de gota.

**Árvore**: pinheiro com 3 camadas triangulares empilhadas (verde escuro embaixo, médio no meio, claro no topo) + tronco marrom retangular.

---

## Layout do Card

- Tema dark: fundo `#161A21`, borda `#232934`, texto `#E8ECF1`
- Grid de 2 colunas: **SVG da árvore** à esquerda (~280px), **dados** à direita
- A planta cresce sutilmente dentro do seu nível conforme o progresso interno (0→1) avança

**Lado direito contém:**

1. Título: `"Score de Sustentabilidade"`
2. Subtítulo dinâmico baseado no nível:
   - Semente: `"Primeiros passos na jornada digital"`
   - Broto: `"Crescendo em práticas sustentáveis"`
   - Árvore: `"Referência em sustentabilidade digital"`
3. Score grande em verde claro: ex. `62.0 / 100`
4. Três stats (usar os campos do DTO):
   - `CO₂ economizado` → `(score.co2Saved / 1000).toFixed(2) + " kg"`
   - `Transações` → `score.totalTransactions`
   - `% Digitais` → `((score.digitalTransactions / score.totalTransactions) * 100).toFixed(1) + "%"`
5. Barra de progresso até o próximo nível com 3 ticks circulares (0, 34, 67, 100)
6. Escala com os 3 nomes: `Semente | Broto | Árvore` (nível atual destacado em verde)

**Badge abaixo da árvore**: pílula com ponto verde brilhante + `score.label` + contador tipo `1/3`, `2/3`, `3/3`

---

## Comportamento

- Score interpolado: dentro de cada nível, a planta cresce sutilmente conforme o progresso interno avança de 0 a 1
- Contadores de score e CO₂ animam ao mudar (easing cubic-out, ~700ms)
- Se `score === null`, exibe mensagem: `"Sem dados para o período selecionado."`

---

## Interface do Componente

```jsx
// Dashboard.jsx já chama assim — não alterar a interface:
<ScoreCard score={score} />

// score é null  OU  o objeto ScoreDTO com os campos:
// score.score, score.label, score.co2Saved,
// score.totalTransactions, score.digitalTransactions,
// score.actualCO2, score.baselineCO2, score.startDate, score.endDate
```

---

## Regras de Implementação

- Apenas 3 níveis (índices 0, 1, 2) — qualquer condicional de "próximo nível" deve checar `level < 2`, **nunca** `level < 3`, para evitar acessar índice inexistente no array de nomes
- Não adicionar dependências externas — usar apenas React + CSS
- Não alterar `Dashboard.jsx`, `api.js`, nem nenhum outro arquivo
- Reescrever apenas `ScoreCard.jsx` e `ScoreCard.css`
- Tipografia: Inter (já disponível via Google Fonts ou system-ui fallback)
