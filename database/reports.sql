-- Relatórios financeiros principais (PostgreSQL)

-- 1. Contas a pagar e receber por período
SELECT e.type,i.due_date,e.description,p.name party,pr.name project,
       i.amount_cents,i.paid_cents,i.status
FROM entry_installments i
JOIN financial_entries e ON e.id=i.entry_id
LEFT JOIN parties p ON p.id=e.party_id
LEFT JOIN projects pr ON pr.id=e.project_id
WHERE e.organization_id=:organization_id
  AND i.due_date BETWEEN :start_date AND :end_date
ORDER BY i.due_date;

-- 2. Resultado por evento
SELECT * FROM vw_project_financial_result
WHERE organization_id=:organization_id ORDER BY result_cents DESC;

-- 3. Orçado x realizado por evento e categoria
SELECT pr.name project,ca.code,ca.name category,bi.type,
       SUM(bi.quantity*bi.unit_amount_cents) budget_cents,
       COALESCE(SUM(e.total_cents),0) actual_cents
FROM budget_items bi
JOIN projects pr ON pr.id=bi.project_id
JOIN chart_accounts ca ON ca.id=bi.chart_account_id
LEFT JOIN financial_entries e ON e.project_id=bi.project_id
 AND e.chart_account_id=bi.chart_account_id AND e.status<>'CANCELLED'
WHERE bi.organization_id=:organization_id
GROUP BY pr.name,ca.code,ca.name,bi.type
ORDER BY pr.name,ca.code;

-- 4. Despesas internas mensais
SELECT date_trunc('month',e.competence_date)::date month,ca.name,
       SUM(e.total_cents) total_cents
FROM financial_entries e
JOIN chart_accounts ca ON ca.id=e.chart_account_id
JOIN cost_centers cc ON cc.id=e.cost_center_id
WHERE e.organization_id=:organization_id AND e.type='EXPENSE'
 AND cc.scope='INTERNAL' AND e.status<>'CANCELLED'
GROUP BY date_trunc('month',e.competence_date),ca.name
ORDER BY month,ca.name;

-- 5. DRE gerencial
SELECT date_trunc('month',e.competence_date)::date month,
 SUM(CASE WHEN e.type='INCOME' THEN e.total_cents ELSE 0 END) gross_revenue_cents,
 SUM(CASE WHEN e.type='EXPENSE' AND cc.scope='PROJECT' THEN e.total_cents ELSE 0 END) event_costs_cents,
 SUM(CASE WHEN e.type='EXPENSE' AND cc.scope='INTERNAL' THEN e.total_cents ELSE 0 END) internal_expenses_cents,
 SUM(CASE WHEN e.type='INCOME' THEN e.total_cents ELSE -e.total_cents END) net_result_cents
FROM financial_entries e LEFT JOIN cost_centers cc ON cc.id=e.cost_center_id
WHERE e.organization_id=:organization_id AND e.status<>'CANCELLED'
GROUP BY date_trunc('month',e.competence_date) ORDER BY month;

-- 6. Fluxo de caixa realizado
SELECT * FROM vw_monthly_cash_flow
WHERE organization_id=:organization_id ORDER BY month;

-- 7. Inadimplência / atrasos
SELECT i.due_date,e.description,p.name party,pr.name project,
       i.amount_cents-i.paid_cents outstanding_cents
FROM entry_installments i JOIN financial_entries e ON e.id=i.entry_id
LEFT JOIN parties p ON p.id=e.party_id LEFT JOIN projects pr ON pr.id=e.project_id
WHERE e.organization_id=:organization_id AND i.status IN ('OPEN','PARTIAL','OVERDUE')
 AND i.due_date<CURRENT_DATE ORDER BY i.due_date;

-- 8. Fornecedores com maior volume
SELECT p.id,p.name,COUNT(DISTINCT e.id) entries,SUM(e.total_cents) total_cents
FROM financial_entries e JOIN parties p ON p.id=e.party_id
WHERE e.organization_id=:organization_id AND e.type='EXPENSE' AND e.status<>'CANCELLED'
GROUP BY p.id,p.name ORDER BY total_cents DESC;

-- 9. Clientes por faturamento e valores recebidos
SELECT p.id,p.name,SUM(e.total_cents) billed_cents,
 COALESCE(SUM(s.amount_cents) FILTER(WHERE s.reversed_at IS NULL),0) received_cents
FROM financial_entries e JOIN parties p ON p.id=e.party_id
LEFT JOIN entry_installments i ON i.entry_id=e.id
LEFT JOIN settlements s ON s.installment_id=i.id
WHERE e.organization_id=:organization_id AND e.type='INCOME' AND e.status<>'CANCELLED'
GROUP BY p.id,p.name ORDER BY billed_cents DESC;

-- 10. Custo com funcionários e freelancers por evento
SELECT pr.name project,p.name person,p.type,SUM(e.total_cents) total_cents
FROM financial_entries e JOIN parties p ON p.id=e.party_id
LEFT JOIN projects pr ON pr.id=e.project_id
WHERE e.organization_id=:organization_id AND e.type='EXPENSE'
 AND p.type IN ('EMPLOYEE','FREELANCER') AND e.status<>'CANCELLED'
GROUP BY pr.name,p.name,p.type ORDER BY pr.name,total_cents DESC;
