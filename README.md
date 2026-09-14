# Gestor Financeiro de Eventos

Sistema para controlar o resultado individual de cada evento e as despesas internas da empresa.

## Implementado

- modelo PostgreSQL com eventos, centros de custo, plano de contas, pessoas, contas financeiras, receitas, despesas, parcelas, baixas, rateios, orçamentos, anexos, conciliação e auditoria;
- plano de contas inicial específico para produção de eventos;
- consultas de fluxo de caixa, DRE, inadimplência, clientes, fornecedores e rentabilidade;
- API TypeScript autenticada para consultar cadastros, criar lançamentos e alimentar o dashboard.

## Instalação

1. Instale Node.js 22 e PostgreSQL 16.
2. Copie `.env.example` para `.env`.
3. Configure `DATABASE_URL`, `INTERNAL_API_TOKEN` e `ORGANIZATION_ID`.
4. Execute `npm install`.
5. Execute o arquivo `database/schema.sql` no PostgreSQL.
6. Cadastre a empresa e use seu UUID em `ORGANIZATION_ID`.
7. Execute `npm run dev`.

Nunca publique o arquivo `.env` ou credenciais no GitHub.

## Rotas iniciais

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/projects`
- `GET /api/parties`
- `GET /api/chart-accounts`
- `GET /api/cost-centers`
- `GET /api/financial-accounts`
- `GET /api/entries`
- `POST /api/entries`
- `GET /api/reports/projects`
- `GET /api/reports/cash-flow`

Todas as rotas financeiras exigem `Authorization: Bearer <token>`. Valores monetários são armazenados em centavos com `BIGINT`.
