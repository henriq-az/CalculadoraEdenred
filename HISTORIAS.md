# Contexto do Projeto

## Objetivo

Desenvolver funcionalidades relacionadas à sustentabilidade para a plataforma Edenred, permitindo visualizar, calcular, simular e exportar impactos ambientais associados ao uso de pagamentos digitais.

---

# História 1 – Visualização do Impacto Ambiental por Transação

## Descrição

Como empresa cliente da Edenred, quero visualizar em um painel de sustentabilidade um relatório consolidado e atualizado das transações digitais realizadas pelos meus colaboradores, contendo métricas de impacto ambiental como redução estimada de CO₂ por tipo de pagamento (PIX, NFC e transferência bancária), segmentadas por período e volume de uso, para acompanhar a evolução dos indicadores sustentáveis da empresa e embasar decisões estratégicas relacionadas a metas ESG.

## Critérios de Aceitação

- O sistema deve calcular e exibir o impacto ambiental estimado com base nas transações digitais realizadas pelos colaboradores.
- O impacto deve ser apresentado em métricas claras (ex.: redução de CO₂ em gramas ou quilogramas).
- O cálculo deve considerar o tipo de pagamento utilizado (PIX, NFC ou transferência bancária).
- As informações devem ser consolidadas e apresentadas em um painel ou relatório acessível pela empresa.
- Caso não seja possível calcular o impacto, o sistema deve exibir uma mensagem informando que os dados estão indisponíveis.
- A empresa deve conseguir acessar o histórico de impacto por período (ex.: diário, mensal).

## Cenários BDD

### Cenário 1 – Visualização de impacto de transações digitais

**Dado** que a empresa acessa o painel de sustentabilidade  
**Quando** existem transações digitais realizadas pelos colaboradores  
**Então** o sistema deve exibir o impacto ambiental correspondente, como "Foram evitados 120g de CO₂ no período"

### Cenário 2 – Diferentes tipos de pagamento considerados

**Dado** que existem transações realizadas via PIX, NFC e transferência bancária  
**Quando** o sistema calcula o impacto ambiental  
**Então** o sistema deve considerar o tipo de pagamento para gerar os indicadores de impacto

### Cenário 3 – Dados indisponíveis para cálculo

**Dado** que há transações cujo tipo de pagamento não foi identificado  
**Quando** o sistema tenta calcular o impacto ambiental  
**Então** o sistema deve exibir a mensagem "Não foi possível calcular o impacto de parte das transações"

---

# História 2 – Visualização do Progresso de Sustentabilidade do Usuário

## Descrição

Como usuário B2B da plataforma Edenred, quero visualizar o progresso de sustentabilidade da minha empresa por meio de uma representação visual que seja atualizada conforme a utilização ou não de pagamentos digitais, para acompanhar o impacto ambiental e garantir os benefícios de adotar hábitos mais sustentáveis.

## Critérios de Aceitação

- O sistema deve exibir uma visualização do progresso de sustentabilidade do usuário.
- A visualização deve ser apresentada em forma de uma árvore que cresce conforme o score de sustentabilidade aumenta.
- O crescimento da árvore deve refletir a proporção do uso de pagamentos digitais realizados pelo usuário em relação aos físicos.
- O sistema deve exibir o score atual de sustentabilidade do usuário.
- A visualização deve ser atualizada automaticamente conforme novas transações são realizadas.

## Cenários BDD

### Cenário 1 – Visualizar árvore de sustentabilidade

**Dado** que o usuário possui um score de sustentabilidade calculado  
**Quando** ele acessa a seção de progresso sustentável  
**Então** o sistema deve exibir uma árvore representando seu nível de sustentabilidade

### Cenário 2 – Crescimento da árvore com novas transações

**Dado** que o usuário realizou novas transações com pagamento digital  
**Quando** o sistema recalcula seu score de sustentabilidade  
**Então** a árvore deve crescer para refletir o novo nível de progresso sustentável

---

# História 3 – Cálculo por Período Personalizado

## Descrição

Como usuário que quer entender o impacto em diferentes momentos, quero escolher o período que quero calcular semanal, mensal ou anual, para ter uma visão do meu impacto ambiental no tempo que faz mais sentido para mim.

## Critérios de Aceitação

- O usuário pode selecionar o período: última semana, último mês ou último ano.
- O sistema ajusta automaticamente os totais de CO₂ e equivalências para o período selecionado.
- A troca de período não exige recalcular do zero, apenas reescala o resultado já calculado.
- O período selecionado fica visível no resultado para evitar confusão.

## Cenários BDD

### Cenário 1 – Usuário troca de mensal para anual

**Dado** que o usuário visualizou seu resultado mensal de 53,1g de CO₂  
**Quando** ele seleciona "Ver projeção anual"  
**Então** o sistema deve exibir 637,2g (×12) com a mesma equivalência em árvores e km, indicando claramente "estimativa anual"

### Cenário 2 – Período exibido no resultado

**Dado** que o usuário selecionou o período "último mês"  
**Quando** o resultado é exibido  
**Então** o período deve aparecer em destaque junto ao resultado para evitar que o usuário confunda com valores diários ou anuais

---

# História 4 – Exportação do Relatório de Impacto em PDF

## Descrição

Como gestor de sustentabilidade, quero exportar o relatório de impacto ambiental das transações da minha empresa em formato PDF, para apresentar os dados em reuniões e relatórios ESG externos.

## Critérios de Aceitação

- O sistema deve disponibilizar um botão de exportação no painel de sustentabilidade.
- O PDF gerado deve conter as métricas de impacto ambiental do período selecionado.
- O PDF deve incluir o período de referência claramente identificado.
- O PDF deve ser gerado em até 10 segundos após a solicitação.
- Caso a geração falhe, o sistema deve exibir uma mensagem de erro orientando o usuário.

## Cenários BDD

### Cenário 1 – Exportação bem-sucedida

**Dado** que o gestor visualiza o painel com dados do período selecionado  
**Quando** ele clica em "Exportar PDF"  
**Então** o sistema deve gerar e disponibilizar o download de um PDF com as métricas do período

### Cenário 2 – PDF com período identificado

**Dado** que o gestor selecionou o período "último mês"  
**Quando** o PDF é gerado  
**Então** o documento deve exibir claramente o período de referência junto às métricas

### Cenário 3 – Falha na geração

**Dado** que o gestor solicitou a exportação  
**Quando** ocorre um erro no sistema durante a geração  
**Então** o sistema deve exibir a mensagem "Não foi possível gerar o relatório. Tente novamente."

---

# Épica – Simulação de Impacto na Migração Digital e Gestão de Cenários

## Descrição

Como gestor de sustentabilidade de uma empresa cliente da Edenred, quero simular o impacto ambiental de diferentes cenários de migração do pagamento físico para o digital (NFC, Wallet, QR Code e PIX), comparar os resultados por tipo de pagamento e categoria, salvar e revisitar cenários configurados, para avaliar a redução de emissões de CO₂ antes de tomar a decisão de migrar a operação e acompanhar a evolução das simulações ao longo do tempo.

---

# Sub-história 1 – Simular Impacto Ambiental da Migração para Pagamentos Digitais

## Descrição

Como gestor de sustentabilidade de uma empresa cliente da Edenred, quero visualizar em tempo real o cenário atual de emissões da minha empresa e a projeção 100% digital, comparando os diferentes tipos de pagamento digital (NFC, Wallet, QR Code e PIX), para avaliar a redução de CO₂ estimada antes de decidir migrar minha operação, sem necessidade de salvar ou persistir dados neste momento.

## Critérios de Aceitação

- O sistema exibe o cenário atual da empresa:
    - Total de transações físicas.
    - Total de transações digitais separadas por tipo (NFC, Wallet, QR Code e PIX).
    - Emissões correspondentes em kg de CO₂.
- O sistema exibe a projeção 100% digital ao lado do cenário atual.
- O sistema informa o total de CO₂ que seria evitado.
- O sistema destaca qual tipo de pagamento digital gera a menor emissão.

## Cenários BDD

### Cenário 1 – Visualizar projeção 100% digital

**Dado** que a empresa realiza 60% das transações com cartão físico  
**Quando** o gestor acessa a área de simulação  
**Então** o sistema exibe o cenário atual ao lado do cenário 100% digital com a diferença de CO₂ destacada visualmente

### Cenário 2 – Comparar tipos de pagamento digital

**Dado** que a área de simulação está sendo acessada  
**Quando** o gestor visualiza a projeção por tipo de pagamento digital  
**Então** o sistema exibe a redução estimada de CO₂ para cada tipo (NFC, Wallet, QR Code e PIX) separadamente

### Cenário 3 – Indicação do tipo de pagamento digital mais sustentável

**Dado** que a área de simulação está sendo acessada e as projeções de redução de CO₂ foram calculadas  
**Quando** o gestor visualiza o comparativo entre os métodos de pagamento (NFC, Wallet, QR Code e PIX)  
**Então** o sistema deve destacar visualmente e indicar de forma clara qual tipo de pagamento digital gera a menor emissão de CO₂ entre as opções apresentadas

---

# Sub-história 2 – Salvar e Recuperar Cenários de Simulação

## Descrição

Como gestor de sustentabilidade, quero salvar um cenário de simulação que configurei, nomeá-lo e acessar cenários salvos anteriormente com todos os parâmetros e resultados originais, para revisitar simulações passadas, comparar com simulações futuras e acompanhar a evolução do impacto ambiental da minha operação ao longo do tempo.

## Critérios de Aceitação

- O sistema disponibiliza um botão "Salvar cenário" na área de simulação, visível após a projeção ser calculada.
- O gestor pode nomear o cenário antes de salvar (campo obrigatório).
- O sistema lista os cenários salvos anteriormente em uma seção acessível a partir da área de simulação.
- O gestor consegue abrir um cenário salvo e visualizar todos os parâmetros e resultados originais da simulação.
- Caso o gestor tente salvar sem nomear o cenário, o sistema exibe a mensagem "Insira um nome para o cenário antes de salvar" e não prossegue com o salvamento.

## Cenários BDD

### Cenário 1 – Salvar cenário com nome

**Dado** que o gestor configurou e visualizou uma simulação  
**Quando** clica em "Salvar cenário" e insere o nome "Migração Q2 2025"  
**Então** o sistema salva o cenário e o exibe na lista de cenários salvos com o nome "Migração Q2 2025"

### Cenário 2 – Acessar cenário salvo

**Dado** que o gestor possui cenários salvos listados na seção de cenários  
**Quando** acessa a lista de cenários salvos e seleciona um cenário  
**Então** o sistema exibe todos os parâmetros e resultados originais daquele cenário:
- Tipo de pagamento.
- Categorias.
- Valores de CO₂ atual.
- Valores de CO₂ projetado.

### Cenário 3 – Tentar salvar sem nome

**Dado** que o gestor clica em "Salvar cenário" sem inserir um nome  
**Quando** tenta confirmar o salvamento  
**Então** o sistema exibe a mensagem "Insira um nome para o cenário antes de salvar" e não realiza o salvamento