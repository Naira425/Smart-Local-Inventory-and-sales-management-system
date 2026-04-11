// ============================================================
// Smart Inventory System - Backend API Server
// Node.js + Express + MySQL2
// Run: node server.js
// ============================================================

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json());

// Serve frontend files from the same directory
app.use(express.static(path.join(__dirname)));

// ============================================================
// DATABASE CONNECTION POOL
// Update host/user/password/database to match your MySQL setup
// ============================================================
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',          // ← change to your MySQL username
    password: 'password@1',           // ← change to your MySQL password
    database: 'smart_inventory',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test DB connection on startup
(async () => {
    try {
        const conn = await pool.getConnection();
        console.log('✅ MySQL connected successfully');
        conn.release();
    } catch (err) {
        console.error('❌ MySQL connection failed:', err.message);
        console.error('Make sure MySQL is running and credentials in server.js are correct.');
    }
})();

// ============================================================
// AUTH ROUTES
// ============================================================

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        // Owner & admin are hardcoded roles; check employees table for all
        const [rows] = await pool.execute(
            'SELECT id, name, username, role, must_change_password FROM employees WHERE username = ? AND password = ?',
            [username, password]
        );
        if (rows.length === 0) return res.json({ success: false, message: 'Invalid username or password' });
        const user = rows[0];
        if (role && user.role !== role) return res.json({ success: false, message: `Account is not a ${role}` });
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/change-password
app.post('/api/change-password', async (req, res) => {
    const { userId, newPassword } = req.body;
    try {
        await pool.execute(
            'UPDATE employees SET password = ?, must_change_password = FALSE WHERE id = ?',
            [newPassword, userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// PRODUCTS ROUTES
// ============================================================

// GET /api/products
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT p.id, p.name, p.category, p.quantity, p.price,
                   s.name AS supplier, s.contact_email AS supplierContact
            FROM products p
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            ORDER BY p.category, p.name
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/products
app.post('/api/products', async (req, res) => {
    const { name, category, quantity, price, supplier, supplierContact } = req.body;
    try {
        // Upsert supplier
        let supplierId = null;
        if (supplier) {
            await pool.execute(
                'INSERT INTO suppliers (name, contact_email) VALUES (?, ?) ON DUPLICATE KEY UPDATE contact_email = VALUES(contact_email)',
                [supplier, supplierContact || `info@${supplier.toLowerCase().replace(/\s/g,'')}.com`]
            );
            const [sRows] = await pool.execute('SELECT id FROM suppliers WHERE name = ?', [supplier]);
            if (sRows.length) supplierId = sRows[0].id;
        }
        const [result] = await pool.execute(
            'INSERT INTO products (name, category, quantity, price, supplier_id) VALUES (?, ?, ?, ?, ?)',
            [name, category, quantity, price, supplierId]
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/products/:id
app.put('/api/products/:id', async (req, res) => {
    const { name, category, quantity, price, supplier, supplierContact } = req.body;
    const { id } = req.params;
    try {
        let supplierId = null;
        if (supplier) {
            await pool.execute(
                'INSERT INTO suppliers (name, contact_email) VALUES (?, ?) ON DUPLICATE KEY UPDATE contact_email = VALUES(contact_email)',
                [supplier, supplierContact || `info@${supplier.toLowerCase().replace(/\s/g,'')}.com`]
            );
            const [sRows] = await pool.execute('SELECT id FROM suppliers WHERE name = ?', [supplier]);
            if (sRows.length) supplierId = sRows[0].id;
        }
        await pool.execute(
            'UPDATE products SET name=?, category=?, quantity=?, price=?, supplier_id=? WHERE id=?',
            [name, category, quantity, price, supplierId, id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/products/:id
app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// SALES ROUTES
// ============================================================

// GET /api/sales
app.get('/api/sales', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT id, product_id AS productId, product_name AS productName,
                   category, unit_price AS amount, quantity, total_amount,
                   sale_date AS date, sale_timestamp AS timestamp
            FROM sales ORDER BY sale_timestamp DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/sales/today
app.get('/api/sales/today', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT id, product_id AS productId, product_name AS productName,
                   category, unit_price AS amount, quantity, total_amount,
                   sale_date AS date, sale_timestamp AS timestamp
            FROM sales WHERE sale_date = CURDATE()
            ORDER BY sale_timestamp DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/sales  (record a new sale)
app.post('/api/sales', async (req, res) => {
    const { productId, quantity, cashierId } = req.body;
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Lock the product row
        const [pRows] = await conn.execute(
            'SELECT id, name, category, price, quantity FROM products WHERE id = ? FOR UPDATE',
            [productId]
        );
        if (!pRows.length) {
            await conn.rollback();
            return res.json({ success: false, message: 'Product not found' });
        }
        const product = pRows[0];
        if (product.quantity === 0) {
            await conn.rollback();
            return res.json({ success: false, message: `${product.name} is OUT OF STOCK!` });
        }
        if (product.quantity < quantity) {
            await conn.rollback();
            return res.json({ success: false, message: `Only ${product.quantity} units available.` });
        }

        // Deduct stock
        await conn.execute(
            'UPDATE products SET quantity = quantity - ? WHERE id = ?',
            [quantity, productId]
        );

        // Insert sale record
        const today = new Date().toISOString().split('T')[0];
        const [result] = await conn.execute(
            `INSERT INTO sales (product_id, product_name, category, unit_price, quantity, sale_date, cashier_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [product.id, product.name, product.category, product.price, quantity, today, cashierId || null]
        );

        await conn.commit();
        const total = (product.price * quantity).toFixed(2);
        res.json({
            success: true,
            message: `Sold ${quantity} x ${product.name} for M${total}`,
            saleId: result.insertId
        });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
});

// ============================================================
// EMPLOYEES ROUTES
// ============================================================

// GET /api/employees
app.get('/api/employees', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, name, username, role, must_change_password AS mustChangePassword FROM employees ORDER BY id'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/employees
app.post('/api/employees', async (req, res) => {
    const { name, username, password, role } = req.body;
    try {
        const [result] = await pool.execute(
            'INSERT INTO employees (name, username, password, role, must_change_password) VALUES (?, ?, ?, ?, TRUE)',
            [name, username, password || 'temp123', role || 'cashier']
        );
        res.json({ success: true, id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.json({ success: false, message: 'Username already exists' });
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/employees/:id
app.put('/api/employees/:id', async (req, res) => {
    const { name, username, role, password } = req.body;
    const { id } = req.params;
    try {
        if (password) {
            await pool.execute(
                'UPDATE employees SET name=?, username=?, role=?, password=? WHERE id=?',
                [name, username, role, password, id]
            );
        } else {
            await pool.execute(
                'UPDATE employees SET name=?, username=?, role=? WHERE id=?',
                [name, username, role, id]
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/employees/:id
app.delete('/api/employees/:id', async (req, res) => {
    try {
        await pool.execute('DELETE FROM employees WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// SUPPLIERS ROUTES
// ============================================================

// GET /api/suppliers
app.get('/api/suppliers', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM suppliers ORDER BY name');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================
// RAW QUERY ENDPOINT (for the Query Console)
// ⚠️ For development/admin use only. Restrict in production.
// ============================================================

// POST /api/query  { sql: "SELECT ..." }
app.post('/api/query', async (req, res) => {
    const { sql: rawSql } = req.body;
    if (!rawSql || !rawSql.trim()) return res.json({ error: 'Empty query' });

    // Basic safety: block DROP DATABASE / TRUNCATE on employees
    const upper = rawSql.trim().toUpperCase();
    if (upper.startsWith('DROP DATABASE') || upper.startsWith('DROP TABLE')) {
        return res.json({ error: 'DROP DATABASE and DROP TABLE are disabled in the query console.' });
    }

    try {
        const [rows, fields] = await pool.execute(rawSql);
        const isSelect = upper.startsWith('SELECT') || upper.startsWith('SHOW') || upper.startsWith('DESCRIBE');
        if (isSelect) {
            const columns = fields ? fields.map(f => f.name) : [];
            res.json({ success: true, type: 'select', columns, rows });
        } else {
            res.json({ success: true, type: 'exec', affectedRows: rows.affectedRows, info: rows.info || '' });
        }
    } catch (err) {
        res.json({ error: err.message });
    }
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
    console.log(`\n🚀 Smart Inventory Server running at http://localhost:${PORT}`);
    console.log(`📋 Query Console:       http://localhost:${PORT}/query-console.html`);
    console.log(`🔐 Login page:          http://localhost:${PORT}/index.html\n`);
});
