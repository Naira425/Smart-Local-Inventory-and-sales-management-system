-- ============================================================
-- Smart Local Market Inventory & Sales Management System
-- MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS market_db;
USE market_db;

-- -----------------------------------------------
-- TABLE: categories
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------
-- TABLE: suppliers
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(150),
    phone VARCHAR(30),
    email VARCHAR(150),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -----------------------------------------------
-- TABLE: products
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    barcode VARCHAR(60) UNIQUE,
    category_id INT,
    supplier_id INT,
    unit VARCHAR(30) NOT NULL DEFAULT 'pcs',   -- e.g. pcs, kg, litre, box
    buy_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    sell_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock_qty INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 10,
    status ENUM('active','inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE SET NULL
);

-- -----------------------------------------------
-- TABLE: customers
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(150),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------
-- TABLE: employees
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','cashier','storekeeper') DEFAULT 'cashier',
    phone VARCHAR(30),
    email VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------
-- TABLE: sales
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,                  -- NULL = walk-in
    employee_id INT,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    change_given DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('cash','card','mobile_money') DEFAULT 'cash',
    note TEXT,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE SET NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL
);

-- -----------------------------------------------
-- TABLE: sale_details (line items per sale)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS sale_details (
    detail_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
);

-- -----------------------------------------------
-- TABLE: stock_adjustments (manual restocking / corrections)
-- -----------------------------------------------
CREATE TABLE IF NOT EXISTS stock_adjustments (
    adjustment_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    employee_id INT,
    type ENUM('restock','correction','damage','return') DEFAULT 'restock',
    quantity_change INT NOT NULL,      -- positive = add, negative = remove
    note TEXT,
    adjusted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE SET NULL
);

-- =============================================
-- SAMPLE DATA
-- =============================================

INSERT INTO categories (name, description) VALUES
('Beverages', 'Drinks, juices, water, sodas'),
('Dairy & Eggs', 'Milk, cheese, butter, eggs'),
('Grains & Flour', 'Maize meal, flour, rice, pasta'),
('Meat & Fish', 'Fresh and frozen meat products'),
('Snacks', 'Chips, biscuits, sweets, chocolates'),
('Household', 'Cleaning products, detergents'),
('Personal Care', 'Soap, toothpaste, shampoo'),
('Vegetables & Fruits', 'Fresh produce');

INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
('Lesotho Flour Mills', 'Thabo Ntlele', '+26622320000', 'orders@lfm.co.ls', 'Maseru Industrial Area'),
('Lancers Inn Beverages', 'Mary Dube', '+26622318500', 'supply@lancers.co.ls', 'Kingsway, Maseru'),
('FreshFarm Produce', 'Mpho Letsie', '+26657001234', 'fresh@farmls.co.ls', 'Ha Matala, Maseru'),
('CleanHome Distributors', 'Jane Mokhosi', '+26658009876', 'info@cleanhome.co.ls', 'Maseru West');

INSERT INTO employees (full_name, username, password_hash, role, phone) VALUES
('Admin Owner', 'admin', '$2b$12$placeholder_hash_admin', 'admin', '+26657000001'),
('Cashier Lerato', 'cashier1', '$2b$12$placeholder_hash_c1', 'cashier', '+26657000002'),
('Storekeeper Tabo', 'storekeeper1', '$2b$12$placeholder_hash_s1', 'storekeeper', '+26657000003');

INSERT INTO products (name, barcode, category_id, supplier_id, unit, buy_price, sell_price, stock_qty, low_stock_threshold) VALUES
('Ace Maize Meal 5kg', '6001000001', 3, 1, 'bag', 45.00, 58.00, 120, 20),
('Blue Ribbon Flour 2kg', '6001000002', 3, 1, 'bag', 22.00, 28.50, 80, 15),
('Sunlight Dish Liquid 750ml', '6001000003', 6, 4, 'bottle', 18.00, 25.00, 60, 10),
('Coca-Cola 2L', '6001000004', 1, 2, 'bottle', 15.00, 20.00, 200, 30),
('Fresh Milk 1L', '6001000005', 2, 3, 'carton', 12.00, 16.00, 50, 10),
('Large Eggs x12', '6001000006', 2, 3, 'tray', 28.00, 35.00, 40, 10),
('Lays Chips 150g', '6001000007', 5, 2, 'pcs', 8.00, 12.00, 90, 20),
('OMO Washing Powder 2kg', '6001000008', 6, 4, 'box', 55.00, 70.00, 35, 8),
('Colgate Toothpaste 100ml', '6001000009', 7, 4, 'tube', 16.00, 22.00, 45, 10),
('Rice 2kg', '6001000010', 3, 1, 'bag', 30.00, 40.00, 5, 15);

INSERT INTO customers (name, phone) VALUES
('Walk-in Customer', NULL),
('Mamello Mokoena', '+26657100001'),
('Teboho Sefali', '+26657100002');
