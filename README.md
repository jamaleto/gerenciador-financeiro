# Gestor Financeiro de Eventos

Sistema de gestão financeira para empresas de produção, organização e projetos de eventos.

## Objetivo

Controlar duas dimensões de forma integrada:

- resultado individual de cada evento ou projeto;
- despesas internas, fluxo de caixa e resultado geral da empresa.

## Módulos previstos

- empresas e unidades;
- usuários, perfis e permissões;
- eventos, projetos e centros de custo;
- clientes, fornecedores, funcionários e freelancers;
- plano de contas;
- contas bancárias e caixas;
- receitas, despesas, parcelas, recorrências e rateios;
- pagamentos, recebimentos, baixas e estornos;
- orçamento previsto, contratado e realizado;
- anexos, comprovantes e auditoria;
- fluxo de caixa, DRE e relatórios gerenciais.

## Tecnologia proposta

- Next.js + TypeScript;
- PostgreSQL;
- API com validação e controle de acesso;
- exportações em Excel e PDF.

> O banco nunca deve armazenar valores monetários em ponto flutuante. Os valores são guardados em centavos (BIGINT).
