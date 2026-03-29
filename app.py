from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__)
CORS(app)

DB_FILE = os.path.join(os.path.dirname(__file__), 'saald_inventory.db')

# Routes for serving HTML pages
@app.route('/')
def index():
    return send_file('index.html')

@app.route('/admin')
def admin():
    return send_file('admin.html')

@app.route('/cashier')
def cashier():
    return send_file('cashier.html')

@app.route('/owner')
def owner():
    return send_file('owner.html')

# Routes for static files
@app.route('/<path:filename>')
def static_files(filename):
    if filename.endswith(('.html', '.css', '.js')):
        return send_file(filename)
    return jsonify({'error': 'File not found'}), 404

def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


# Generic helpers

@app.route('/api/products', methods=['GET', 'POST'])
def products():
    if request.method == 'GET':
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT p.*, c.name AS category, s.name AS supplier FROM products p JOIN categories c ON p.category_id=c.id JOIN suppliers s ON p.supplier_id=s.id ORDER BY p.id")
            rows = cursor.fetchall()
        return jsonify([dict(row) for row in rows])

    data = request.json
    required = ['name', 'category_id', 'supplier_id', 'quantity', 'price']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing fields'}), 400

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO products (name, category_id, supplier_id, quantity, price, sku) VALUES (?,?,?,?,?,?)",
            (data['name'], data['category_id'], data['supplier_id'], data['quantity'], data['price'], data.get('sku'))
        )
        new_id = cursor.lastrowid
        cursor.execute("SELECT * FROM products WHERE id=?", (new_id,))
        product = cursor.fetchone()
    return jsonify(dict(product)), 201


@app.route('/api/products/<int:product_id>', methods=['PUT', 'DELETE', 'GET'])
def product_detail(product_id):
    if request.method == 'GET':
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT p.*, c.name AS category, s.name AS supplier FROM products p JOIN categories c ON p.category_id=c.id JOIN suppliers s ON p.supplier_id=s.id WHERE p.id=?", (product_id,))
            product = cursor.fetchone()
        if not product:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(dict(product))

    if request.method == 'DELETE':
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM products WHERE id=?", (product_id,))
        return jsonify({'message': 'Deleted'})

    data = request.json
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE products SET name=?, category_id=?, supplier_id=?, quantity=?, price=?, sku=? WHERE id=?",
            (data['name'], data['category_id'], data['supplier_id'], data['quantity'], data['price'], data.get('sku'), product_id)
        )
        cursor.execute("SELECT * FROM products WHERE id=?", (product_id,))
        product = cursor.fetchone()
    return jsonify(dict(product))


@app.route('/api/categories', methods=['GET', 'POST'])
def categories():
    if request.method == 'GET':
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM categories ORDER BY name")
            rows = cursor.fetchall()
        return jsonify([dict(row) for row in rows])

    data = request.json
    if not data.get('name'):
        return jsonify({'error': 'Name required'}), 400
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO categories (name, description) VALUES (?,?)", (data['name'], data.get('description')))
        new_id = cursor.lastrowid
        cursor.execute("SELECT * FROM categories WHERE id=?", (new_id,))
        row = cursor.fetchone()
    return jsonify(dict(row)), 201


@app.route('/api/suppliers', methods=['GET', 'POST'])
def suppliers():
    if request.method == 'GET':
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM suppliers ORDER BY name")
            rows = cursor.fetchall()
        return jsonify([dict(row) for row in rows])

    data = request.json
    if not data.get('name'):
        return jsonify({'error': 'Name required'}), 400

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO suppliers (name, contact_name, contact_email, contact_phone, address) VALUES (?,?,?,?,?)",
            (data['name'], data.get('contact_name'), data.get('contact_email'), data.get('contact_phone'), data.get('address'))
        )
        new_id = cursor.lastrowid
        cursor.execute("SELECT * FROM suppliers WHERE id=?", (new_id,))
        row = cursor.fetchone()
    return jsonify(dict(row)), 201


@app.route('/api/employees', methods=['GET', 'POST'])
def employees():
    if request.method == 'GET':
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, username, role, must_change_password, created_at FROM employees ORDER BY id")
            rows = cursor.fetchall()
        return jsonify([dict(row) for row in rows])

    data = request.json
    required = ['name', 'username', 'password', 'role']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing fields'}), 400

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO employees (name, username, password, role, must_change_password) VALUES (?,?,?,?,?)",
                       (data['name'], data['username'], data['password'], data['role'], data.get('must_change_password', True)))
        new_id = cursor.lastrowid
        cursor.execute("SELECT id, name, username, role, must_change_password, created_at FROM employees WHERE id=?", (new_id,))
        row = cursor.fetchone()
    return jsonify(dict(row)), 201


@app.route('/api/employees/<int:employee_id>', methods=['PUT', 'DELETE', 'GET'])
def employee_detail(employee_id):
    if request.method == 'GET':
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name, username, role, must_change_password, created_at FROM employees WHERE id=?", (employee_id,))
            row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Not found'}), 404
        return jsonify(dict(row))

    if request.method == 'DELETE':
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM employees WHERE id=?", (employee_id,))
        return jsonify({'message': 'Deleted'})

    data = request.json
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE employees SET name=?, username=?, role=?, password=?, must_change_password=? WHERE id=?",
            (data['name'], data['username'], data.get('role'), data.get('password'), data.get('must_change_password', False), employee_id)
        )
        cursor.execute("SELECT id, name, username, role, must_change_password, created_at FROM employees WHERE id=?", (employee_id,))
        row = cursor.fetchone()
    return jsonify(dict(row))


@app.route('/api/sales', methods=['GET', 'POST'])
def sales():
    if request.method == 'GET':
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT s.*, e.username AS employee FROM sales s LEFT JOIN employees e ON s.employee_id=e.id ORDER BY sale_date DESC")
            rows = cursor.fetchall()
        return jsonify([dict(row) for row in rows])

    data = request.json
    required = ['employee_id', 'items']
    if not all(k in data for k in required):
        return jsonify({'error': 'Missing fields'}), 400

    items = data['items']
    total_amount = sum(item['quantity'] * item['unit_price'] for item in items)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO sales (employee_id, total_amount) VALUES (?,?)", (data['employee_id'], total_amount))
        sale_id = cursor.lastrowid
        for item in items:
            subtotal = item['quantity'] * item['unit_price']
            cursor.execute("INSERT INTO sales_details (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?,?,?,?,?)",
                           (sale_id, item['product_id'], item['quantity'], item['unit_price'], subtotal))
            cursor.execute("UPDATE products SET quantity = quantity - ? WHERE id=?", (item['quantity'], item['product_id']))

    return jsonify({'id': sale_id, 'total_amount': float(total_amount)}), 201


@app.route('/api/sales/<int:sale_id>', methods=['GET'])
def sale_detail(sale_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sales WHERE id=?", (sale_id,))
        sale = cursor.fetchone()
        if not sale:
            return jsonify({'error': 'Not found'}), 404
        cursor.execute("SELECT sd.*, p.name AS product_name FROM sales_details sd JOIN products p ON sd.product_id = p.id WHERE sd.sale_id=?", (sale_id,))
        details = cursor.fetchall()
    sale_dict = dict(sale)
    sale_dict['details'] = [dict(row) for row in details]
    return jsonify(sale_dict)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
