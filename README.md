# Smart Inventory System — MySQL Setup Guide

## What's Included

| File | Description |
|------|-------------|
| `schema.sql` | MySQL database schema + seed data |
| `server.js` | Node.js/Express REST API backend |
| `package.json` | Node dependencies |
| `index.js` | Updated login page (API-based) |
| `admin.js` | Updated admin dashboard (API-based) |
| `cashier.js` | Updated cashier dashboard (API-based) |
| `owner.js` | Updated owner dashboard (API-based) |
| `query-console.html` | MySQL Query Console (manual querying UI) |

---

## Step 1 — Set Up MySQL Database

Open MySQL (MySQL Workbench, terminal, or phpMyAdmin) and run:

```sql
source /path/to/schema.sql;
```

Or paste the entire contents of `schema.sql` into your MySQL client.

This creates the `smart_inventory` database with all tables, views, and seed data.

---

## Step 2 — Install Node.js Dependencies

Make sure Node.js (v16+) is installed, then in your project folder:

```bash
npm install
```

---

## Step 3 — Configure Database Credentials

Open `server.js` and update the connection pool near the top:

```js
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',        // ← your MySQL username
    password: '',        // ← your MySQL password
    database: 'smart_inventory',
    ...
});
```

---

## Step 4 — Replace Frontend JS Files

Copy the updated JS files into your project folder, replacing the originals:
- `index.js`
- `admin.js`
- `cashier.js`
- `owner.js`

Also add `query-console.html` to your project folder.

---

## Step 5 — Start the Server

```bash
node server.js
```

You should see:

```
✅ MySQL connected successfully
🚀 Smart Inventory Server running at http://localhost:3000
📋 Query Console: http://localhost:3000/query-console.html
🔐 Login page:    http://localhost:3000/index.html
```

---

## Step 6 — Access the System

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Login page |
| `http://localhost:3000/query-console.html` | MySQL Query Console |

### Default Login Credentials

| Role | Username | Password |
|------|----------|----------|
| 👑 Owner | `owner` | `owner123` |
| ⚙️ Admin | `admin` | `admin123` |
| 💰 Cashier | `cashier` | `cashier123` |

---

## Database Tables

```
employees   — user accounts (owner, admin, cashier)
suppliers   — vendor/supplier info
products    — inventory items (linked to suppliers)
sales       — transaction records (linked to products + cashier)
```

## Views (for reporting)

```sql
v_sales_report          -- full sales with cashier names
v_revenue_by_category   -- sales revenue grouped by category
v_revenue_by_product    -- sales revenue grouped by product
v_inventory_with_supplier -- stock with supplier & status
```

---

## Query Console

Visit `http://localhost:3000/query-console.html` to:
- Run any SQL query (SELECT, INSERT, UPDATE, DELETE)
- Use built-in quick-query shortcuts
- See results in a formatted table
- Use `Ctrl+Enter` to run queries

> ⚠️ `DROP DATABASE` and `DROP TABLE` are blocked in the console for safety.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Authenticate user |
| POST | `/api/change-password` | Change password |
| GET | `/api/products` | List all products |
| POST | `/api/products` | Add product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| GET | `/api/sales` | All sales |
| GET | `/api/sales/today` | Today's sales |
| POST | `/api/sales` | Record a sale (deducts stock) |
| GET | `/api/employees` | List employees |
| POST | `/api/employees` | Add employee |
| PUT | `/api/employees/:id` | Update employee |
| DELETE | `/api/employees/:id` | Delete employee |
| GET | `/api/suppliers` | List suppliers |
| POST | `/api/query` | Run raw SQL (query console) |
