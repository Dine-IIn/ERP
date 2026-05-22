CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_name varchar(255) NOT NULL,
  display_name varchar(255) NOT NULL,
  slug varchar(120) NOT NULL UNIQUE,
  database_name varchar(120) NOT NULL UNIQUE,
  status varchar(40) NOT NULL DEFAULT 'active',
  branding jsonb NOT NULL DEFAULT '{}',
  feature_flags jsonb NOT NULL DEFAULT '{}',
  license jsonb NOT NULL DEFAULT '{}',
  deployment_config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS platform_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  role varchar(60) NOT NULL,
  status varchar(40) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL,
  product_id uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  type varchar(40) NOT NULL,
  quantity numeric(18, 4) NOT NULL,
  reference_type varchar(120),
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_id
  ON inventory_movements(company_id);

CREATE TABLE IF NOT EXISTS workflow_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL,
  name varchar(255) NOT NULL,
  module varchar(120) NOT NULL,
  trigger jsonb NOT NULL,
  actions jsonb NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid
);

CREATE INDEX IF NOT EXISTS idx_workflow_rules_company_id
  ON workflow_rules(company_id);
