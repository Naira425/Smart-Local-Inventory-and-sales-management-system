"""
Smart Local Market Inventory & Sales Management System
Flask Backend API

HOW TO RUN:
1. Install dependencies:
   pip install flask flask-cors mysql-connector-python bcrypt

2. Make sure MySQL is running and you have imported db.sql

3. Update DB_CONFIG below with your credentials

4. Run:
   python app.py

5. API will be available at http://localhost:5000
"""

from flask import Flask, request, jsonify, session
from flask_cors import CORS
import mysql.connector
import bcrypt
from datetime import datetime
from functools import wraps

app = Flask(__name__)
app.secret_key = "market_secret_key_change_in_production"
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True

# Allow requests from the frontend (VS Code Live Server default ports)
CORS(app, supports_credentials=True, origins=[
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:3000",
    "http://localhost:3000"
])

# -----------------------------------------------
# DATABASE CONFIG — update with your credentials
# -----------------------------------------------
DB_CONFIG = {
    "host":     "localhost",
    "user":     "root",       # your MySQL username
    "password": "1234",           # your MySQL password
    "database": "market_db"
}

# =============================================
# HELPERS
# =============================================

def get_db():
    return mysql.connector.connect(**DB_CONFIG)

def require_login(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "employee_id" not in session:
            return jsonify({"error": "Unauthorized. Please log in."}), 401
        return f(*args, **kwargs)
    return wrapper

def require_role(*roles):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if "employee_id" not in session:
                return jsonify({"error": "Unauthorized."}), 401
            if session.get("role") not in roles:
                return jsonify({"error": "Forbidden. Insufficient permissions."}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator

def serial_date(obj):
    """Convert date/datetime to string for JSON."""
    if isinstance(obj, datetime):
        return obj.strftime("%Y-%m-%d %H:%M:%S")
    if hasattr(obj, 'isoformat'):
        return str(obj)
    return obj

def clean(rows):
    """Make a list of dicts JSON-safe."""
    if isinstance(rows, list):
        return [{k: serial_date(v) for k, v in row.items()} for row in rows]
    return {k: serial_date(v) for k, v in rows.items()}


# =============================================
# AUTH
# =============================================

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "")
    if not username or not password:
        return jsonify({"error": "Username and password required."}), 400
    try:
        db = get_db()
        cur = db.cursor(dictionary=True)
        cur.execute("SELECT * FROM employees WHERE username=%s AND is_active=TRUE", (username,))
        emp = cur.fetchone()
        cur.close()
        db.close()
        if not emp:
            return jsonify({"error": "Invalid credentials."}), 401
        if not bcrypt.checkpw(password.encode(), emp["password_hash"].encode()):
            return jsonify({"error": "Invalid credentials."}), 401
        # Update last login
        db = get_db()
        cur = db.cursor()
        cur.execute("UPDATE employees SET last_login=NOW() WHERE employee_id=%s", (emp["employee_id"],))
        db.commit()
        cur.close()
        db.close()
        session["employee_id"] = emp["employee_id"]
        session["username"]    = emp["username"]
        session["role"]        = emp["role"]
        session["full_name"]   = emp["full_name"]
        return jsonify({"message": "Login successful.", "user": {
            "employee_id": emp["employee_id"],
            "username": emp["username"],
            "full_name": emp["full_name"],
            "role": emp["role"]
        }})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out."})


@app.route("/api/me", methods=["GET"])
def me():
    if "employee_id" not in session:
        return jsonify({"error": "Not logged in."}), 401
    return jsonify({
        "employee_id": session["employee_id"],
        "username":    session["username"],
        "full_name":   session["full_name"],
        "role":        session["role"]
    })


# =============================================
# DASHBOARD
# =============================================

@app.route("/api/dashboard", methods=["GET"])
@require_login
def dashboard():
    try:
        db = get_db()
        cur = db.cursor(dictionary=True)

        cur.execute("SELECT COUNT(*) AS c FROM products WHERE status='active'")
        total_products = cur.fetchone()["c"]

        cur.execute("SELECT COUNT(*) AS c FROM products WHERE stock_qty <= low_stock_threshold AND status='active'")
        low_stock = cur.fetchone()["c"]

        cur.execute("SELECT COUNT(*) AS c FROM sales WHERE DATE(sale_date)=CURDATE()")
        sales_today = cur.fetchone()["c"]

        cur.execute("SELECT COALESCE(SUM(total_amount),0) AS rev FROM sales WHERE DATE(sale_date)=CURDATE()")
        revenue_today = float(cur.fetchone()["rev"])

        cur.execute("SELECT COALESCE(SUM(total_amount),0) AS rev FROM sales WHERE MONTH(sale_date)=MONTH(NOW()) AND YEAR(sale_date)=YEAR(NOW())")
        revenue_month = float(cur.fetchone()["rev"])

        # Revenue last 7 days
        cur.execute("""
            SELECT DATE(sale_date) AS day, COALESCE(SUM(total_amount),0) AS total
            FROM sales
            WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(sale_date)
            ORDER BY day
        """)
        weekly = [{"day": str(r["day"]), "total": float(r["total"])} for r in cur.fetchall()]

        # Top 5 products by qty sold this month
        cur.execute("""
            SELECT p.name, SUM(sd.quantity) AS qty_sold
            FROM sale_details sd
            JOIN products p ON sd.product_id=p.product_id
            JOIN sales s ON sd.sale_id=s.sale_id
            WHERE MONTH(s.sale_date)=MONTH(NOW()) AND YEAR(s.sale_date)=YEAR(NOW())
            GROUP BY sd.product_id
            ORDER BY qty_sold DESC
            LIMIT 5
        """)
        top_products = cur.fetchall()

        # Low stock items
        cur.execute("""
            SELECT p.name, p.stock_qty, p.low_stock_threshold, c.name AS category
            FROM products p
            LEFT JOIN categories c ON p.category_id=c.category_id
            WHERE p.stock_qty <= p.low_stock_threshold AND p.status='active'
            ORDER BY p.stock_qty ASC
            LIMIT 10
        """)
        low_items = cur.fetchall()

        # Recent 5 sales
        cur.execute("""
            SELECT s.sale_id, s.total_amount, s.payment_method, s.sale_date,
                   COALESCE(cu.name,'Walk-in') AS customer_name,
                   e.full_name AS cashier
            FROM sales s
            LEFT JOIN customers cu ON s.customer_id=cu.customer_id
            LEFT JOIN employees e ON s.employee_id=e.employee_id
            ORDER BY s.sale_date DESC LIMIT 5
        """)
        recent_sales = cur.fetchall()

        cur.close()
        db.close()
        return jsonify({
            "total_products": total_products,
            "low_stock": low_stock,
            "sales_today": sales_today,
            "revenue_today": revenue_today,
            "revenue_month": revenue_month,
            "weekly_chart": weekly,
            "top_products": top_products,
            "low_stock_items": low_items,
            "recent_sales": clean(recent_sales)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================
# CATEGORIES
# =============================================

@app.route("/api/categories", methods=["GET"])
@require_login
def get_categories():
    try:
        db = get_db()
        cur = db.cursor(dictionary=True)
        cur.execute("SELECT * FROM categories ORDER BY name")
        rows = cur.fetchall()
        cur.close(); db.close()
        return jsonify(clean(rows))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/categories", methods=["POST"])
@require_role("admin", "storekeeper")
def add_category():
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"error": "Category name required."}), 400
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO categories (name, description) VALUES (%s,%s)",
                    (data["name"], data.get("description")))
        db.commit()
        new_id = cur.lastrowid
        cur.close(); db.close()
        return jsonify({"message": "Category added.", "category_id": new_id}), 201
    except mysql.connector.IntegrityError:
        return jsonify({"error": "Category name already exists."}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/categories/<int:cid>", methods=["DELETE"])
@require_role("admin")
def delete_category(cid):
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("DELETE FROM categories WHERE category_id=%s", (cid,))
        db.commit()
        cur.close(); db.close()
        return jsonify({"message": "Category deleted."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================
# SUPPLIERS
# =============================================

@app.route("/api/suppliers", methods=["GET"])
@require_login
def get_suppliers():
    search = request.args.get("search", "")
    try:
        db = get_db()
        cur = db.cursor(dictionary=True)
        q = "SELECT * FROM suppliers WHERE 1=1"
        p = []
        if search:
            q += " AND (name LIKE %s OR contact_person LIKE %s)"
            p += [f"%{search}%", f"%{search}%"]
        q += " ORDER BY name"
        cur.execute(q, p)
        rows = cur.fetchall()
        cur.close(); db.close()
        return jsonify(clean(rows))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/suppliers", methods=["POST"])
@require_role("admin", "storekeeper")
def add_supplier():
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"error": "Supplier name required."}), 400
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("""INSERT INTO suppliers (name,contact_person,phone,email,address)
                       VALUES (%s,%s,%s,%s,%s)""",
                    (data["name"], data.get("contact_person"),
                     data.get("phone"), data.get("email"), data.get("address")))
        db.commit()
        new_id = cur.lastrowid
        cur.close(); db.close()
        return jsonify({"message": "Supplier added.", "supplier_id": new_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/suppliers/<int:sid>", methods=["PUT"])
@require_role("admin", "storekeeper")
def update_supplier(sid):
    data = request.get_json()
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("""UPDATE suppliers SET name=%s,contact_person=%s,phone=%s,email=%s,address=%s
                       WHERE supplier_id=%s""",
                    (data.get("name"), data.get("contact_person"), data.get("phone"),
                     data.get("email"), data.get("address"), sid))
        db.commit()
        cur.close(); db.close()
        return jsonify({"message": "Supplier updated."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/suppliers/<int:sid>", methods=["DELETE"])
@require_role("admin")
def delete_supplier(sid):
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("DELETE FROM suppliers WHERE supplier_id=%s", (sid,))
        db.commit()
        cur.close(); db.close()
        return jsonify({"message": "Supplier deleted."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================
# PRODUCTS
# =============================================

@app.route("/api/products", methods=["GET"])
@require_login
def get_products():
    search   = request.args.get("search", "")
    cat_id   = request.args.get("category_id", "")
    low_only = request.args.get("low_stock", "")
    try:
        db = get_db()
        cur = db.cursor(dictionary=True)
        q = """SELECT p.*, c.name AS category_name, s.name AS supplier_name
               FROM products p
               LEFT JOIN categories c ON p.category_id=c.category_id
               LEFT JOIN suppliers s ON p.supplier_id=s.supplier_id
               WHERE p.status='active'"""
        params = []
        if search:
            q += " AND (p.name LIKE %s OR p.barcode LIKE %s)"
            params += [f"%{search}%", f"%{search}%"]
        if cat_id:
            q += " AND p.category_id=%s"
            params.append(cat_id)
        if low_only == "1":
            q += " AND p.stock_qty <= p.low_stock_threshold"
        q += " ORDER BY p.name"
        cur.execute(q, params)
        rows = cur.fetchall()
        cur.close(); db.close()
        return jsonify(clean(rows))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/products/<int:pid>", methods=["GET"])
@require_login
def get_product(pid):
    try:
        db = get_db()
        cur = db.cursor(dictionary=True)
        cur.execute("""SELECT p.*, c.name AS category_name, s.name AS supplier_name
                       FROM products p
                       LEFT JOIN categories c ON p.category_id=c.category_id
                       LEFT JOIN suppliers s ON p.supplier_id=s.supplier_id
                       WHERE p.product_id=%s""", (pid,))
        row = cur.fetchone()
        cur.close(); db.close()
        if not row:
            return jsonify({"error": "Product not found."}), 404
        return jsonify(clean(row))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/products", methods=["POST"])
@require_role("admin", "storekeeper")
def add_product():
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"error": "Product name required."}), 400
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("""INSERT INTO products
                       (name,barcode,category_id,supplier_id,unit,buy_price,sell_price,
                        stock_qty,low_stock_threshold)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (data["name"], data.get("barcode"), data.get("category_id"),
                     data.get("supplier_id"), data.get("unit","pcs"),
                     data.get("buy_price",0), data.get("sell_price",0),
                     data.get("stock_qty",0), data.get("low_stock_threshold",10)))
        db.commit()
        new_id = cur.lastrowid
        cur.close(); db.close()
        return jsonify({"message": "Product added.", "product_id": new_id}), 201
    except mysql.connector.IntegrityError:
        return jsonify({"error": "Barcode already exists."}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/products/<int:pid>", methods=["PUT"])
@require_role("admin", "storekeeper")
def update_product(pid):
    data = request.get_json()
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("""UPDATE products SET name=%s,barcode=%s,category_id=%s,supplier_id=%s,
                       unit=%s,buy_price=%s,sell_price=%s,stock_qty=%s,
                       low_stock_threshold=%s,status=%s
                       WHERE product_id=%s""",
                    (data.get("name"), data.get("barcode"), data.get("category_id"),
                     data.get("supplier_id"), data.get("unit"), data.get("buy_price"),
                     data.get("sell_price"), data.get("stock_qty"),
                     data.get("low_stock_threshold"), data.get("status","active"), pid))
        db.commit()
        cur.close(); db.close()
        return jsonify({"message": "Product updated."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/products/<int:pid>", methods=["DELETE"])
@require_role("admin")
def delete_product(pid):
    try:
        db = get_db()
        cur = db.cursor()
        # Soft delete
        cur.execute("UPDATE products SET status='inactive' WHERE product_id=%s", (pid,))
        db.commit()
        cur.close(); db.close()
        return jsonify({"message": "Product removed."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/products/<int:pid>/restock", methods=["POST"])
@require_role("admin", "storekeeper")
def restock_product(pid):
    data = request.get_json()
    qty = int(data.get("quantity", 0))
    if qty <= 0:
        return jsonify({"error": "Quantity must be positive."}), 400
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("UPDATE products SET stock_qty=stock_qty+%s WHERE product_id=%s", (qty, pid))
        cur.execute("""INSERT INTO stock_adjustments (product_id,employee_id,type,quantity_change,note)
                       VALUES (%s,%s,'restock',%s,%s)""",
                    (pid, session["employee_id"], qty, data.get("note")))
        db.commit()
        cur.close(); db.close()
        return jsonify({"message": f"Stock updated. Added {qty} units."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================
# CUSTOMERS
# =============================================

@app.route("/api/customers", methods=["GET"])
@require_login
def get_customers():
    search = request.args.get("search", "")
    try:
        db = get_db()
        cur = db.cursor(dictionary=True)
        q = "SELECT * FROM customers WHERE 1=1"
        p = []
        if search:
            q += " AND (name LIKE %s OR phone LIKE %s)"
            p += [f"%{search}%", f"%{search}%"]
        q += " ORDER BY name"
        cur.execute(q, p)
        rows = cur.fetchall()
        cur.close(); db.close()
        return jsonify(clean(rows))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/customers", methods=["POST"])
@require_login
def add_customer():
    data = request.get_json()
    if not data.get("name"):
        return jsonify({"error": "Customer name required."}), 400
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("INSERT INTO customers (name,phone,email,address) VALUES (%s,%s,%s,%s)",
                    (data["name"], data.get("phone"), data.get("email"), data.get("address")))
        db.commit()
        new_id = cur.lastrowid
        cur.close(); db.close()
        return jsonify({"message": "Customer added.", "customer_id": new_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================
# SALES (POS)
# =============================================

@app.route("/api/sales", methods=["GET"])
@require_login
def get_sales():
    date_from = request.args.get("date_from", "")
    date_to   = request.args.get("date_to", "")
    search    = request.args.get("search", "")
    try:
        db = get_db()
        cur = db.cursor(dictionary=True)
        q = """SELECT s.sale_id, s.total_amount, s.discount, s.amount_paid,
                      s.change_given, s.payment_method, s.sale_date,
                      COALESCE(cu.name,'Walk-in') AS customer_name,
                      e.full_name AS cashier_name
               FROM sales s
               LEFT JOIN customers cu ON s.customer_id=cu.customer_id
               LEFT JOIN employees e ON s.employee_id=e.employee_id
               WHERE 1=1"""
        params = []
        if date_from:
            q += " AND DATE(s.sale_date) >= %s"; params.append(date_from)
        if date_to:
            q += " AND DATE(s.sale_date) <= %s"; params.append(date_to)
        if search:
            q += " AND (cu.name LIKE %s OR e.full_name LIKE %s)"
            params += [f"%{search}%", f"%{search}%"]
        q += " ORDER BY s.sale_date DESC"
        cur.execute(q, params)
        rows = cur.fetchall()
        cur.close(); db.close()
        return jsonify(clean(rows))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/sales/<int:sale_id>", methods=["GET"])
@require_login
def get_sale(sale_id):
    try:
        db = get_db()
        cur = db.cursor(dictionary=True)
        cur.execute("""SELECT s.*, COALESCE(cu.name,'Walk-in') AS customer_name,
                              e.full_name AS cashier_name
                       FROM sales s
                       LEFT JOIN customers cu ON s.customer_id=cu.customer_id
                       LEFT JOIN employees e ON s.employee_id=e.employee_id
                       WHERE s.sale_id=%s""", (sale_id,))
        sale = cur.fetchone()
        if not sale:
            cur.close(); db.close()
            return jsonify({"error": "Sale not found."}), 404
        cur.execute("""SELECT sd.*, p.name AS product_name, p.unit
                       FROM sale_details sd
                       JOIN products p ON sd.product_id=p.product_id
                       WHERE sd.sale_id=%s""", (sale_id,))
        items = cur.fetchall()
        cur.close(); db.close()
        sale = clean(sale)
        sale["items"] = items
        return jsonify(sale)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/sales", methods=["POST"])
@require_login
def create_sale():
    """
    Body: {
      customer_id: int|null,
      payment_method: "cash"|"card"|"mobile_money",
      discount: float,
      amount_paid: float,
      note: str,
      items: [ {product_id, quantity, unit_price}, ... ]
    }
    """
    data = request.get_json()
    items = data.get("items", [])
    if not items:
        return jsonify({"error": "No items in sale."}), 400
    try:
        db = get_db()
        cur = db.cursor(dictionary=True)

        # Validate stock for all items first
        for item in items:
            cur.execute("SELECT stock_qty, name FROM products WHERE product_id=%s AND status='active'",
                        (item["product_id"],))
            prod = cur.fetchone()
            if not prod:
                cur.close(); db.close()
                return jsonify({"error": f"Product ID {item['product_id']} not found."}), 404
            if prod["stock_qty"] < item["quantity"]:
                cur.close(); db.close()
                return jsonify({"error": f"Insufficient stock for '{prod['name']}'. Available: {prod['stock_qty']}"}), 400

        discount = float(data.get("discount", 0))
        subtotal = sum(float(i["unit_price"]) * int(i["quantity"]) for i in items)
        total    = max(subtotal - discount, 0)
        paid     = float(data.get("amount_paid", total))
        change   = max(paid - total, 0)

        cur2 = db.cursor()
        cur2.execute("""INSERT INTO sales
                        (customer_id,employee_id,total_amount,discount,amount_paid,change_given,payment_method,note)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
                     (data.get("customer_id"), session["employee_id"],
                      total, discount, paid, change,
                      data.get("payment_method","cash"), data.get("note")))
        db.commit()
        sale_id = cur2.lastrowid

        for item in items:
            qty        = int(item["quantity"])
            unit_price = float(item["unit_price"])
            sub        = qty * unit_price
            cur2.execute("""INSERT INTO sale_details (sale_id,product_id,quantity,unit_price,subtotal)
                            VALUES (%s,%s,%s,%s,%s)""",
                         (sale_id, item["product_id"], qty, unit_price, sub))
            # Reduce stock
            cur2.execute("UPDATE products SET stock_qty=stock_qty-%s WHERE product_id=%s",
                         (qty, item["product_id"]))
        db.commit()
        cur2.close()
        cur.close()
        db.close()
        return jsonify({"message": "Sale recorded.", "sale_id": sale_id,
                        "total": total, "change": change}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================
# REPORTS
# =============================================

@app.route("/api/reports/sales-by-category", methods=["GET"])
@require_login
def report_by_category():
    date_from = request.args.get("date_from", "")
    date_to   = request.args.get("date_to", "")
    try:
        db = get_db()
        cur = db.cursor(dictionary=True)
        q = """SELECT COALESCE(c.name,'Uncategorized') AS category,
                      SUM(sd.quantity) AS qty_sold,
                      SUM(sd.subtotal) AS revenue
               FROM sale_details sd
               JOIN products p ON sd.product_id=p.product_id
               LEFT JOIN categories c ON p.category_id=c.category_id
               JOIN sales s ON sd.sale_id=s.sale_id
               WHERE 1=1"""
        params = []
        if date_from: q += " AND DATE(s.sale_date)>=%s"; params.append(date_from)
        if date_to:   q += " AND DATE(s.sale_date)<=%s"; params.append(date_to)
        q += " GROUP BY c.category_id ORDER BY revenue DESC"
        cur.execute(q, params)
        rows = cur.fetchall()
        cur.close(); db.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/reports/top-products", methods=["GET"])
@require_login
def report_top_products():
    date_from = request.args.get("date_from", "")
    date_to   = request.args.get("date_to", "")
    limit     = int(request.args.get("limit", 10))
    try:
        db = get_db()
        cur = db.cursor(dictionary=True)
        q = """SELECT p.name, p.unit, SUM(sd.quantity) AS qty_sold, SUM(sd.subtotal) AS revenue
               FROM sale_details sd
               JOIN products p ON sd.product_id=p.product_id
               JOIN sales s ON sd.sale_id=s.sale_id
               WHERE 1=1"""
        params = []
        if date_from: q += " AND DATE(s.sale_date)>=%s"; params.append(date_from)
        if date_to:   q += " AND DATE(s.sale_date)<=%s"; params.append(date_to)
        q += " GROUP BY p.product_id ORDER BY qty_sold DESC LIMIT %s"
        params.append(limit)
        cur.execute(q, params)
        rows = cur.fetchall()
        cur.close(); db.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/reports/low-stock", methods=["GET"])
@require_login
def report_low_stock():
    try:
        db = get_db()
        cur = db.cursor(dictionary=True)
        cur.execute("""SELECT p.product_id, p.name, p.stock_qty, p.low_stock_threshold,
                              p.unit, c.name AS category, s.name AS supplier
                       FROM products p
                       LEFT JOIN categories c ON p.category_id=c.category_id
                       LEFT JOIN suppliers s ON p.supplier_id=s.supplier_id
                       WHERE p.stock_qty <= p.low_stock_threshold AND p.status='active'
                       ORDER BY p.stock_qty ASC""")
        rows = cur.fetchall()
        cur.close(); db.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/reports/daily-summary", methods=["GET"])
@require_login
def report_daily_summary():
    date_from = request.args.get("date_from", "")
    date_to   = request.args.get("date_to", "")
    try:
        db = get_db()
        cur = db.cursor(dictionary=True)
        q = """SELECT DATE(sale_date) AS sale_day,
                      COUNT(*) AS num_sales,
                      SUM(total_amount) AS revenue,
                      SUM(discount) AS total_discount
               FROM sales WHERE 1=1"""
        params = []
        if date_from: q += " AND DATE(sale_date)>=%s"; params.append(date_from)
        if date_to:   q += " AND DATE(sale_date)<=%s"; params.append(date_to)
        q += " GROUP BY DATE(sale_date) ORDER BY sale_day DESC"
        cur.execute(q, params)
        rows = cur.fetchall()
        cur.close(); db.close()
        return jsonify([{**r, "sale_day": str(r["sale_day"]),
                         "revenue": float(r["revenue"]),
                         "total_discount": float(r["total_discount"])} for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================
# EMPLOYEES (admin only)
# =============================================

@app.route("/api/employees", methods=["GET"])
@require_role("admin")
def get_employees():
    try:
        db = get_db()
        cur = db.cursor(dictionary=True)
        cur.execute("SELECT employee_id,full_name,username,role,phone,email,is_active,last_login,created_at FROM employees ORDER BY full_name")
        rows = cur.fetchall()
        cur.close(); db.close()
        return jsonify(clean(rows))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/employees", methods=["POST"])
@require_role("admin")
def add_employee():
    data = request.get_json()
    for f in ["full_name","username","password","role"]:
        if not data.get(f):
            return jsonify({"error": f"Field '{f}' is required."}), 400
    pw_hash = bcrypt.hashpw(data["password"].encode(), bcrypt.gensalt()).decode()
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("""INSERT INTO employees (full_name,username,password_hash,role,phone,email)
                       VALUES (%s,%s,%s,%s,%s,%s)""",
                    (data["full_name"], data["username"], pw_hash,
                     data["role"], data.get("phone"), data.get("email")))
        db.commit()
        new_id = cur.lastrowid
        cur.close(); db.close()
        return jsonify({"message": "Employee added.", "employee_id": new_id}), 201
    except mysql.connector.IntegrityError:
        return jsonify({"error": "Username already exists."}), 409
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/employees/<int:eid>", methods=["DELETE"])
@require_role("admin")
def delete_employee(eid):
    if eid == session["employee_id"]:
        return jsonify({"error": "Cannot delete your own account."}), 400
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("UPDATE employees SET is_active=FALSE WHERE employee_id=%s", (eid,))
        db.commit()
        cur.close(); db.close()
        return jsonify({"message": "Employee deactivated."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =============================================
# RUN
# =============================================
if __name__ == "__main__":
    app.run(debug=True, port=5000)