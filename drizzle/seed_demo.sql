-- Seed Demo User, Profiles, and Point-of-Purchase Expenses
INSERT OR REPLACE INTO user (
    id, name, email, email_verified, role, default_company_id, month_start_day, created_at, updated_at
) VALUES (
    'user_demo_001',
    'Sipho Ndlovu',
    'demo@brickwork.co.za',
    1,
    'main_member',
    'comp_personal_001',
    25,
    cast(unixepoch() * 1000 as integer),
    cast(unixepoch() * 1000 as integer)
);

INSERT OR REPLACE INTO account (
    id, account_id, provider_id, user_id, password, created_at, updated_at
) VALUES (
    'acc_demo_001',
    'user_demo_001',
    'credential',
    'user_demo_001',
    '71efe64cea25ea2bd87b7c1d142ae723:61e437d2d9428f5affce27649b35ca295783f70de9fa82227cf7d61e0fe1ab7ae5e193948f9480a218a950991322211eebaaa95e3bca18d3815e1ccb6771018b',
    cast(unixepoch() * 1000 as integer),
    cast(unixepoch() * 1000 as integer)
);

-- Personal Company Profile
INSERT OR REPLACE INTO company (id, owner_user_id, name, is_personal, created_at, updated_at)
VALUES ('comp_personal_001', 'user_demo_001', 'Personal', 1, cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer));

-- Personal Categories
INSERT OR REPLACE INTO category (id, company_id, name, monthly_target_cents, color_hex, created_at, updated_at) VALUES
('cat_p1', 'comp_personal_001', 'Groceries', 600000, '#10B981', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer)),
('cat_p2', 'comp_personal_001', 'Fuel & Transport', 350000, '#0284C7', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer)),
('cat_p3', 'comp_personal_001', 'Dining & Entertainment', 250000, '#F59E0B', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer)),
('cat_p4', 'comp_personal_001', 'Utilities & Home', 400000, '#8B5CF6', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer)),
('cat_p5', 'comp_personal_001', 'General / Ad Hoc', 150000, '#64748B', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer));

-- Personal Payment Account
INSERT OR REPLACE INTO payment_account (id, company_id, name, is_default, created_at, updated_at)
VALUES ('pay_p1', 'comp_personal_001', 'Default Card', 1, cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer));

-- Personal Sample Expenses (Current Cycle: 25 Aug - 24 Sep 2026)
INSERT OR REPLACE INTO expense (id, user_id, company_id, category_id, account_id, vendor_name, amount_cents, transaction_date, notes, created_at, updated_at) VALUES
('exp_p1', 'user_demo_001', 'comp_personal_001', 'cat_p1', 'pay_p1', 'Woolworths Food', 48250, '2026-09-15', 'Weekly fresh groceries & pantry', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer)),
('exp_p2', 'user_demo_001', 'comp_personal_001', 'cat_p2', 'pay_p1', 'Shell V-Power', 85000, '2026-09-14', 'Full tank unleaded 95', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer)),
('exp_p3', 'user_demo_001', 'comp_personal_001', 'cat_p3', 'pay_p1', 'Tashas Cafe', 34500, '2026-09-12', 'Family weekend breakfast', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer)),
('exp_p4', 'user_demo_001', 'comp_personal_001', 'cat_p1', 'pay_p1', 'Checkers Hyper', 124990, '2026-09-10', 'Bulk household restock', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer)),
('exp_p5', 'user_demo_001', 'comp_personal_001', 'cat_p4', 'pay_p1', 'City of Johannesburg', 215000, '2026-09-08', 'Rates, water and electricity', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer));

-- Registered Business Company Profile
INSERT OR REPLACE INTO company (id, owner_user_id, name, is_personal, created_at, updated_at)
VALUES ('comp_business_001', 'user_demo_001', 'Apex Solutions (Pty) Ltd', 0, cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer));

-- Business Categories
INSERT OR REPLACE INTO category (id, company_id, name, monthly_target_cents, color_hex, created_at, updated_at) VALUES
('cat_b1', 'comp_business_001', 'Office Supplies & Tech', 500000, '#0B2240', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer)),
('cat_b2', 'comp_business_001', 'Travel & Accommodation', 800000, '#0284C7', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer)),
('cat_b3', 'comp_business_001', 'Client Meals & Dining', 400000, '#F59E0B', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer)),
('cat_b4', 'comp_business_001', 'Software & Cloud Services', 600000, '#8B5CF6', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer));

-- Business Payment Account
INSERT OR REPLACE INTO payment_account (id, company_id, name, is_default, created_at, updated_at)
VALUES ('pay_b1', 'comp_business_001', 'Business Cheque Card', 1, cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer));

-- Business Sample Expenses
INSERT OR REPLACE INTO expense (id, user_id, company_id, category_id, account_id, vendor_name, amount_cents, transaction_date, notes, created_at, updated_at) VALUES
('exp_b1', 'user_demo_001', 'comp_business_001', 'cat_b4', 'pay_b1', 'Cloudflare Inc', 38000, '2026-09-16', 'Workers & R2 edge infrastructure', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer)),
('exp_b2', 'user_demo_001', 'comp_business_001', 'cat_b3', 'pay_b1', 'The Grillhouse Rosebank', 189000, '2026-09-13', 'Client quarterly review dinner', cast(unixepoch() * 1000 as integer), cast(unixepoch() * 1000 as integer));
