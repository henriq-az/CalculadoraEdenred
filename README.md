# CalculadoraEdenred

Plataforma de sustentabilidade para a Edenred que rastreia o impacto ambiental de transações digitais versus físicas, calculando métricas de redução de CO₂ por tipo de pagamento.

## Funcionalidades previstas

- Visualização do impacto ambiental por transação
- Visualização do progresso de sustentabilidade (árvore)
- Simulação de migração digital e gestão de cenários
- Exportação de relatório em PDF
- Cálculo por período personalizado

## Burndown

### Sprint 1 (28/04 – 12/05)
Burndown Sprint 1:
![Burndown Sprint 1](burndown_sprint1.png)

- [Burnup Sprint 1](https://github.com/orgs/root-2026-1/projects/2/insights/3): H1 e H2
- [Burnup Sprint 2](https://github.com/orgs/root-2026-1/projects/2/insights/6): H3 e H4
- [Burnup Sprint 3](https://github.com/orgs/root-2026-1/projects/2/insights/7): Épica
- [Burnup Sprint 4](https://github.com/orgs/root-2026-1/projects/2/insights/8): Últimos testes e correções de Bugs

## Tecnologias

- **Backend:** Java 17 + Spring Boot 3.5
- **Frontend:** React
- **Banco de dados:** PostgreSQL

## Pré-requisitos

- Java 17+
- PostgreSQL rodando localmente na porta 5432
- Node.js (para o frontend)

## Configuração do banco

Crie o banco de dados antes de rodar a aplicação:

```sql
CREATE DATABASE edenred;
```

## Configuração da aplicação

Crie o arquivo `src/main/resources/application.properties` com base no exemplo abaixo (este arquivo não é versionado):

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/edenred
spring.datasource.username=seu_usuario
spring.datasource.password=sua_senha

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
```

## Como rodar o backend

```bash
./mvnw spring-boot:run
```

A aplicação sobe em `http://localhost:8080`.

## Estrutura do projeto

```
src/main/java/com/root/calculadoraedenred/
├── controller/       # Endpoints REST
├── service/          # Regras de negócio
├── repository/       # Acesso ao banco de dados
├── model/            # Entidades JPA
│   └── enums/        # Enums (ex: PaymentType)
└── dto/              # Objetos de transferência de dados
```

