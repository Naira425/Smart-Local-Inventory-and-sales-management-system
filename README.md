# 🛒 MarketPro — Smart Local Market Inventory & Sales System

A full-stack web system for managing products, sales, suppliers, customers, and reports.

---

## 📁 File Structure

```
market_system/
├── index.html          ← Login page
├── dashboard.html      ← Main dashboard
├── sales.html          ← Point of Sale (POS)
├── sales-history.html  ← View all past sales
├── products.html       ← Product & inventory management
├── suppliers.html      ← Supplier management
├── customers.html      ← Customer management
├── reports.html        ← Reports & analytics
├── employees.html      ← Employee management (admin only)
├── style.css           ← All shared styles
├── app.js              ← Shared JS utilities & API helper
├── sidebar.js          ← Sidebar layout builder
├── app.py              ← Python Flask backend API
├── db.sql              ← MySQL database schema + sample data
└── README.md           ← This file
```

---

## ⚙️ Setup Instructions

### 1. MySQL Database
1. Open MySQL Workbench or phpMyAdmin (via XAMPP)
2. Run the file `db.sql` to create the database and tables
3. This also inserts sample products, suppliers, and categories

### 2. Python Backend
Open a terminal in the project folder and run:

```bash
# Install required packages
pip install flask flask-cors mysql-connector-python bcrypt

# Start the backend server
python app.py
```

The backend will run at: **http://localhost:5000**

> ⚠️ If your MySQL password is not empty, open `app.py` and update `DB_CONFIG`:
> ```python
> DB_CONFIG = {
>     "host":     "localhost",
>     "user":     "root",
>     "password": "your_password_here",   ← change this
>     "database": "market_db"
> }

### 3. Frontend
Open the `market_system/` folder in **Visual Studio Code**, then:
- Install the **Live Server** extension (by Ritwick Dey)
- Right-click `index.html` → **Open with Live Server**
- The site opens at: **http://127.0.0.1:5500/index.html**

> Make sure the backend (app.py) is also running at the same time!

---

## 🔑 Default Login Credentials

| Role        | Username      | Password   |
|-------------|---------------|------------|
| Admin       | `admin`       | `admin123` |
| Cashier     | `cashier1`    | `admin123` |
| Storekeeper | `storekeeper1`| `admin123` |

> ⚠️ **Change passwords immediately** after first login in production.

### To set real bcrypt password hashes:
```python
import bcrypt
hash = bcrypt.hashpw(b"your_password", bcrypt.gensalt()).decode()
print(hash)
```
Then update the `password_hash` in the `employees` table.

---

## 👥 User Roles

| Feature                  | Admin | Storekeeper | Cashier |
|--------------------------|-------|-------------|---------|
| Dashboard                | ✅    | ✅          | ✅      |
| Point of Sale            | ✅    | ✅          | ✅      |
| Sales History            | ✅    | ✅          | ✅      |
| View Products            | ✅    | ✅          | ✅      |
| Add/Edit Products        | ✅    | ✅          | ❌      |
| Restock Products         | ✅    | ✅          | ❌      |
| Suppliers Management     | ✅    | ✅          | ❌      |
| Customers                | ✅    | ✅          | ✅      |
| Reports                  | ✅    | ✅          | ✅      |
| Employee Management      | ✅    | ❌          | ❌      |

---

## 🧰 Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | HTML, CSS, JavaScript (Vanilla)         |
| Backend   | Python 3 + Flask                        |
| Database  | MySQL                                   |
| Dev Tools | Visual Studio Code + Live Server        |
| Version Control | GitHub                           |

---

## 🔧 Common Issues

**CORS error in browser?**
- Make sure `app.py` is running on port 5000
- Make sure you're using Live Server (port 5500), not just opening the file directly

**"Access denied" MySQL error?**
- Update the `DB_CONFIG` in `app.py` with correct username/password

**Login says "Invalid credentials"?**
- The sample data uses placeholder hashes. Run this once to fix:
```sql
UPDATE employees SET password_hash = '$2b$12$...real_hash...' WHERE username = 'admin';
```
Or run this Python snippet to generate:
```python
import bcrypt
print(bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode())
```

---

## 📌 GitHub Setup

```bash
git init
git add .
git commit -m "Initial commit — MarketPro system"
git remote add origin https://github.com/yourusername/marketpro.git
git push -u origin main
```

---
*Built for Systems Project — Smart Local Market Inventory & Sales Management System*
