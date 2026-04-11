-- ============================================================
-- Smart Local Inventory & Sales Management System
-- MySQL Database Schema
-- Currency: Maluti (M) | Lesotho
-- ============================================================

CREATE DATABASE IF NOT EXISTS smart_inventory;
USE smart_inventory;

-- ============================================================
-- EMPLOYEES TABLE
-- Stores owner, admin, and cashier accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('owner', 'admin', 'cashier') NOT NULL DEFAULT 'cashier',
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- SUPPLIERS TABLE
-- Stores supplier/vendor information
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    contact_email VARCHAR(100),
    phone VARCHAR(30),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PRODUCTS TABLE
-- Stores product/inventory information
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    price DECIMAL(10, 2) NOT NULL,
    supplier_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- ============================================================
-- SALES TABLE
-- Records every sales transaction
-- ============================================================
CREATE TABLE IF NOT EXISTS sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    product_name VARCHAR(150) NOT NULL,   -- snapshot at time of sale
    category VARCHAR(80) NOT NULL,         -- snapshot at time of sale
    unit_price DECIMAL(10, 2) NOT NULL,    -- price at time of sale
    quantity INT NOT NULL,
    total_amount DECIMAL(10, 2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
    sale_date DATE NOT NULL,
    sale_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cashier_id INT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (cashier_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default credentials:
--   Owner:   owner   / owner123
--   Admin:   admin   / admin123
--   Cashier: cashier / cashier123

INSERT INTO employees (name, username, password, role, must_change_password) VALUES
    ('Store Owner',  'owner',   'owner123',   'owner',   FALSE),
    ('System Admin', 'admin',   'admin123',   'admin',   FALSE),
    ('John Doe',     'cashier', 'cashier123', 'cashier', FALSE),
    ('Jane Smith',   'jane',    'temp123',    'cashier', TRUE);

INSERT INTO suppliers (name, contact_email) VALUES
    ('TechSupply Ltd',  'tech@supply.com'),
    ('PaperHub',        'orders@paperhub.com'),
    ('ErgoFurnish',     'sales@ergofurnish.com'),
    ('CableMaster',     'support@cablemaster.com');

INSERT INTO products (name, category, quantity, price, supplier_id) VALUES
    ('Wireless Mouse', 'Electronics', 5,  29.99, 1),
    ('Notebook',       'Stationery',  3,  4.99,  2),
    ('Office Chair',   'Furniture',   12, 129.99, 3),
    ('USB Cable',      'Electronics', 0,  9.99,  4),
    ('Desk Lamp',      'Furniture',   25, 45.99, 3),
    ('Printer Paper',  'Stationery',  2,  12.99, 2);

-- Seed two sample sales for today
INSERT INTO sales (product_id, product_name, category, unit_price, quantity, sale_date, cashier_id) VALUES
    (1, 'Wireless Mouse', 'Electronics', 29.99, 2, CURDATE(), 3),
    (2, 'Notebook',       'Stationery',  4.99,  3, CURDATE(), 3);

-- ============================================================
-- USEFUL VIEWS FOR REPORTING
-- ============================================================

-- Full sales report with product & cashier details
CREATE OR REPLACE VIEW v_sales_report AS
SELECT
    s.id,
    s.product_name,
    s.category,
    s.unit_price,
    s.quantity,
    s.total_amount,
    s.sale_date,
    s.sale_timestamp,
    e.name AS cashier_name,
    e.username AS cashier_username
FROM sales s
LEFT JOIN employees e ON s.cashier_id = e.id
ORDER BY s.sale_timestamp DESC;

-- Revenue summary by category
CREATE OR REPLACE VIEW v_revenue_by_category AS
SELECT
    category,
    SUM(quantity) AS total_units_sold,
    SUM(total_amount) AS total_revenue
FROM sales
GROUP BY category
ORDER BY total_revenue DESC;

-- Revenue summary by product
CREATE OR REPLACE VIEW v_revenue_by_product AS
SELECT
    product_name,
    category,
    SUM(quantity) AS total_units_sold,
    SUM(total_amount) AS total_revenue
FROM sales
GROUP BY product_name, category
ORDER BY total_revenue DESC;

-- Current inventory with supplier info
CREATE OR REPLACE VIEW v_inventory_with_supplier AS
SELECT
    p.id,
    p.name,
    p.category,
    p.quantity,
    p.price,
    (p.quantity * p.price) AS stock_value,
    s.name AS supplier_name,
    s.contact_email AS supplier_contact,
    CASE
        WHEN p.quantity = 0 THEN 'OUT OF STOCK'
        WHEN p.quantity < 10 THEN 'LOW STOCK'
        ELSE 'OK'
    END AS stock_status
FROM products p
LEFT JOIN suppliers s ON p.supplier_id = s.id
ORDER BY p.category, p.name;

-- ============================================================
-- QUICK QUERY CHEAT SHEET (run these anytime)
-- ============================================================

-- SELECT * FROM employees;
-- SELECT * FROM products;
-- SELECT * FROM suppliers;
-- SELECT * FROM sales;
-- SELECT * FROM v_sales_report;
-- SELECT * FROM v_revenue_by_category;
-- SELECT * FROM v_revenue_by_product;
-- SELECT * FROM v_inventory_with_supplier;

-- Total revenue:
-- SELECT SUM(total_amount) AS total_revenue FROM sales;

-- Today's sales:
-- SELECT * FROM sales WHERE sale_date = CURDATE();

-- Low / out-of-stock items:
-- SELECT * FROM v_inventory_with_supplier WHERE stock_status != 'OK';

-- Products by supplier:
-- SELECT s.name AS supplier, GROUP_CONCAT(p.name) AS products
-- FROM products p JOIN suppliers s ON p.supplier_id = s.id GROUP BY s.name;
