-- Gestor Financeiro de Eventos — PostgreSQL
-- Valores monetários em centavos (BIGINT). Datas financeiras em DATE.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name VARCHAR(180) NOT NULL,
  trade_name VARCHAR(180),
  document VARCHAR(20),
  timezone VARCHAR(50) NOT NULL DEFAULT 'America/Campo_Grande',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(120) NOT NULL,
  document VARCHAR(20),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (organization_id,name)
);

CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(140) NOT NULL,
  email VARCHAR(180) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'VIEWER' CHECK(role IN ('OWNER','ADMIN','FINANCE','MANAGER','VIEWER')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id,email)
);

CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  type VARCHAR(20) NOT NULL CHECK(type IN ('CLIENT','SUPPLIER','EMPLOYEE','FREELANCER','PARTNER','OTHER')),
  person_type VARCHAR(10) NOT NULL DEFAULT 'LEGAL' CHECK(person_type IN ('NATURAL','LEGAL')),
  name VARCHAR(180) NOT NULL,
  document VARCHAR(20),
  email VARCHAR(180),
  phone VARCHAR(30),
  pix_key VARCHAR(180),
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  unit_id UUID REFERENCES units(id),
  client_id UUID REFERENCES parties(id),
  code VARCHAR(30),
  name VARCHAR(180) NOT NULL,
  kind VARCHAR(20) NOT NULL DEFAULT 'EVENT' CHECK(kind IN ('EVENT','INTERNAL','COMMERCIAL','OTHER')),
  status VARCHAR(20) NOT NULL DEFAULT 'PLANNING' CHECK(status IN ('PLANNING','CONTRACTED','IN_PROGRESS','FINISHED','CANCELLED')),
  start_date DATE,
  end_date DATE,
  venue VARCHAR(180),
  city VARCHAR(100),
  contract_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK(contract_amount_cents>=0),
  budget_revenue_cents BIGINT NOT NULL DEFAULT 0 CHECK(budget_revenue_cents>=0),
  budget_expense_cents BIGINT NOT NULL DEFAULT 0 CHECK(budget_expense_cents>=0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id,code)
);

CREATE TABLE cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID REFERENCES projects(id),
  parent_id UUID REFERENCES cost_centers(id),
  code VARCHAR(30),
  name VARCHAR(140) NOT NULL,
  scope VARCHAR(20) NOT NULL CHECK(scope IN ('PROJECT','INTERNAL')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(organization_id,code)
);

CREATE TABLE chart_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  parent_id UUID REFERENCES chart_accounts(id),
  code VARCHAR(30) NOT NULL,
  name VARCHAR(140) NOT NULL,
  nature VARCHAR(10) NOT NULL CHECK(nature IN ('INCOME','EXPENSE')),
  group_name VARCHAR(80),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(organization_id,code)
);

CREATE TABLE financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  unit_id UUID REFERENCES units(id),
  name VARCHAR(120) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK(type IN ('BANK','CASH','DIGITAL_WALLET','CREDIT_CARD')),
  bank_name VARCHAR(100),
  opening_balance_cents BIGINT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(60) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(organization_id,name)
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(60) NOT NULL,
  color VARCHAR(10),
  UNIQUE(organization_id,name)
);

CREATE TABLE financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  unit_id UUID REFERENCES units(id),
  project_id UUID REFERENCES projects(id),
  cost_center_id UUID REFERENCES cost_centers(id),
  chart_account_id UUID NOT NULL REFERENCES chart_accounts(id),
  party_id UUID REFERENCES parties(id),
  responsible_user_id UUID REFERENCES app_users(id),
  type VARCHAR(10) NOT NULL CHECK(type IN ('INCOME','EXPENSE')),
  description VARCHAR(240) NOT NULL,
  document_number VARCHAR(80),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  competence_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_cents BIGINT NOT NULL CHECK(total_cents>0),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK(status IN ('DRAFT','OPEN','PARTIAL','SETTLED','OVERDUE','CANCELLED')),
  recurrence_id UUID,
  notes TEXT,
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE entry_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES financial_entries(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK(installment_number>0),
  due_date DATE NOT NULL,
  amount_cents BIGINT NOT NULL CHECK(amount_cents>0),
  paid_cents BIGINT NOT NULL DEFAULT 0 CHECK(paid_cents>=0),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','PARTIAL','SETTLED','OVERDUE','CANCELLED')),
  UNIQUE(entry_id,installment_number)
);

CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  installment_id UUID NOT NULL REFERENCES entry_installments(id),
  financial_account_id UUID NOT NULL REFERENCES financial_accounts(id),
  payment_method_id UUID REFERENCES payment_methods(id),
  settlement_date DATE NOT NULL,
  amount_cents BIGINT NOT NULL CHECK(amount_cents>0),
  interest_cents BIGINT NOT NULL DEFAULT 0,
  fine_cents BIGINT NOT NULL DEFAULT 0,
  discount_cents BIGINT NOT NULL DEFAULT 0,
  bank_fee_cents BIGINT NOT NULL DEFAULT 0,
  reference VARCHAR(100),
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES app_users(id),
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  source_account_id UUID NOT NULL REFERENCES financial_accounts(id),
  destination_account_id UUID NOT NULL REFERENCES financial_accounts(id),
  transfer_date DATE NOT NULL,
  amount_cents BIGINT NOT NULL CHECK(amount_cents>0),
  description VARCHAR(180),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK(source_account_id<>destination_account_id)
);

CREATE TABLE budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost_center_id UUID REFERENCES cost_centers(id),
  chart_account_id UUID NOT NULL REFERENCES chart_accounts(id),
  description VARCHAR(180) NOT NULL,
  quantity NUMERIC(14,3) NOT NULL DEFAULT 1 CHECK(quantity>0),
  unit_amount_cents BIGINT NOT NULL CHECK(unit_amount_cents>=0),
  type VARCHAR(10) NOT NULL CHECK(type IN ('INCOME','EXPENSE')),
  approved BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES financial_entries(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  cost_center_id UUID REFERENCES cost_centers(id),
  percentage NUMERIC(7,4),
  amount_cents BIGINT NOT NULL CHECK(amount_cents>0),
  CHECK(percentage IS NULL OR (percentage>0 AND percentage<=100))
);

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  entry_id UUID REFERENCES financial_entries(id) ON DELETE CASCADE,
  settlement_id UUID REFERENCES settlements(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120),
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK(entry_id IS NOT NULL OR settlement_id IS NOT NULL)
);

CREATE TABLE bank_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  financial_account_id UUID NOT NULL REFERENCES financial_accounts(id),
  source_file VARCHAR(255),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_by UUID REFERENCES app_users(id)
);

CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_import_id UUID NOT NULL REFERENCES bank_imports(id) ON DELETE CASCADE,
  external_id VARCHAR(180),
  transaction_date DATE NOT NULL,
  description VARCHAR(240) NOT NULL,
  amount_cents BIGINT NOT NULL,
  settlement_id UUID REFERENCES settlements(id),
  reconciled_at TIMESTAMPTZ
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES app_users(id),
  entity VARCHAR(80) NOT NULL,
  entity_id UUID,
  action VARCHAR(30) NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_org_status ON projects(organization_id,status);
CREATE INDEX idx_parties_org_type ON parties(organization_id,type);
CREATE INDEX idx_entries_org_type_status ON financial_entries(organization_id,type,status);
CREATE INDEX idx_entries_project ON financial_entries(project_id);
CREATE INDEX idx_entries_cost_center ON financial_entries(cost_center_id);
CREATE INDEX idx_installments_due_status ON entry_installments(due_date,status);
CREATE INDEX idx_settlements_date_account ON settlements(settlement_date,financial_account_id);
CREATE INDEX idx_budget_project_type ON budget_items(project_id,type);
CREATE INDEX idx_audit_org_created ON audit_logs(organization_id,created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_entries_updated BEFORE UPDATE ON financial_entries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE VIEW vw_project_financial_result AS
SELECT p.id project_id,p.organization_id,p.name,
 COALESCE(SUM(CASE WHEN e.type='INCOME' AND e.status<>'CANCELLED' THEN e.total_cents ELSE 0 END),0) income_cents,
 COALESCE(SUM(CASE WHEN e.type='EXPENSE' AND e.status<>'CANCELLED' THEN e.total_cents ELSE 0 END),0) expense_cents,
 COALESCE(SUM(CASE WHEN e.type='INCOME' AND e.status<>'CANCELLED' THEN e.total_cents ELSE -e.total_cents END),0) result_cents
FROM projects p LEFT JOIN financial_entries e ON e.project_id=p.id
GROUP BY p.id,p.organization_id,p.name;

CREATE VIEW vw_monthly_cash_flow AS
SELECT s.organization_id,date_trunc('month',s.settlement_date)::date month,
 SUM(CASE WHEN e.type='INCOME' THEN s.amount_cents ELSE 0 END) income_cents,
 SUM(CASE WHEN e.type='EXPENSE' THEN s.amount_cents ELSE 0 END) expense_cents,
 SUM(CASE WHEN e.type='INCOME' THEN s.amount_cents ELSE -s.amount_cents END) net_cents
FROM settlements s JOIN entry_installments i ON i.id=s.installment_id
JOIN financial_entries e ON e.id=i.entry_id
WHERE s.reversed_at IS NULL
GROUP BY s.organization_id,date_trunc('month',s.settlement_date);
