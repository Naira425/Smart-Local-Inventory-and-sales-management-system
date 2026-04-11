// ============================================================
// Smart Inventory System - Admin Dashboard
// Uses MySQL backend via REST API
// ============================================================

const API = 'http://localhost:3000/api';

function formatCurrency(amount) {
    return `M${parseFloat(amount).toFixed(2)}`;
}

async function getProducts() {
    const res = await fetch(`${API}/products`);
    return res.json();
}
async function getSales() {
    const res = await fetch(`${API}/sales`);
    return res.json();
}
async function getEmployees() {
    const res = await fetch(`${API}/employees`);
    return res.json();
}

async function getLowStockItems() {
    const products = await getProducts();
    return products.filter(p => p.quantity > 0 && p.quantity < 10);
}
async function getOutOfStockItems() {
    const products = await getProducts();
    return products.filter(p => p.quantity === 0);
}

async function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const low = await getLowStockItems();
    const out = await getOutOfStockItems();
    const total = low.length + out.length;
    if (badge) {
        badge.textContent = total > 0 ? total : '';
        badge.style.display = total > 0 ? 'inline-block' : 'none';
    }
}

async function renderAdminNotifications() {
    const low = await getLowStockItems();
    const out = await getOutOfStockItems();
    let html = '';
    if (out.length) html += `<div class="notification-bar warning"><i class="fas fa-exclamation-triangle"></i><div><strong>OUT OF STOCK:</strong> ${out.map(p => p.name).join(', ')}</div></div>`;
    if (low.length) html += `<div class="notification-bar"><i class="fas fa-box-open"></i><div><strong>LOW STOCK:</strong> ${low.map(p => `${p.name} (${p.quantity} left)`).join(', ')}</div></div>`;
    document.getElementById('adminContent').innerHTML = html || '<div class="card">✅ All stock levels are healthy.</div>';
}

async function renderProductManagement() {
    const products = await getProducts();
    document.getElementById('adminContent').innerHTML = `
        <div class="card">
            <h3>Manage Products</h3>
            <button id="addProductBtn" class="btn-primary" style="margin-bottom:1rem;">+ Add New Product</button>
            <div class="responsive-table">
                <table>
                    <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Quantity</th><th>Price (M)</th><th>Supplier</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${products.map(p => `
                            <tr>
                                <td>${p.id}</td>
                                <td><strong>${p.name}</strong></td>
                                <td>${p.category}</td>
                                <td>${p.quantity}</td>
                                <td>${formatCurrency(p.price)}</td>
                                <td>${p.supplier || '-'}</td>
                                <td class="action-icons">
                                    <i class="fas fa-edit edit-product" data-id="${p.id}" style="cursor:pointer;color:#1f5e7a;margin-right:8px;"></i>
                                    <i class="fas fa-trash-alt delete-product" data-id="${p.id}" style="cursor:pointer;color:#dc2626;"></i>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;

    document.getElementById('addProductBtn')?.addEventListener('click', () => openProductModal());

    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', () => {
            const product = products.find(p => p.id == btn.dataset.id);
            if (product) openProductModal(product);
        });
    });

    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Delete this product?')) return;
            await fetch(`${API}/products/${btn.dataset.id}`, { method: 'DELETE' });
            renderProductManagement();
            updateNotificationBadge();
        });
    });
}

function openProductModal(product = null) {
    document.getElementById('productModalTitle').innerText = product ? 'Edit Product' : 'Add Product';
    document.getElementById('productId').value = product?.id || '';
    document.getElementById('prodName').value = product?.name || '';
    document.getElementById('prodCategory').value = product?.category || '';
    document.getElementById('prodQuantity').value = product?.quantity ?? '';
    document.getElementById('prodPrice').value = product?.price || '';
    document.getElementById('prodSupplier').value = product?.supplier || '';
    document.getElementById('prodSupplierContact').value = product?.supplierContact || '';
    document.getElementById('productModal').style.display = 'flex';
}

async function saveProduct() {
    const id = document.getElementById('productId').value;
    const body = {
        name: document.getElementById('prodName').value.trim(),
        category: document.getElementById('prodCategory').value.trim(),
        quantity: parseInt(document.getElementById('prodQuantity').value),
        price: parseFloat(document.getElementById('prodPrice').value),
        supplier: document.getElementById('prodSupplier').value.trim(),
        supplierContact: document.getElementById('prodSupplierContact').value.trim()
    };
    if (!body.name || !body.category || isNaN(body.quantity) || isNaN(body.price) || !body.supplier) {
        alert('Please fill all required fields'); return;
    }
    const url = id ? `${API}/products/${id}` : `${API}/products`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.success) {
        document.getElementById('productModal').style.display = 'none';
        renderProductManagement();
        updateNotificationBadge();
        alert('Product saved successfully!');
    } else alert(data.message || 'Error saving product');
}

async function renderEmployeeManagement() {
    const employees = await getEmployees();
    document.getElementById('adminContent').innerHTML = `
        <div class="card">
            <h3>Employee Management</h3>
            <button id="addEmployeeBtn" class="btn-primary" style="margin-bottom:1rem;">+ Add New Employee</button>
            <div class="responsive-table">
                <table>
                    <thead><tr><th>ID</th><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${employees.map(e => `
                            <tr>
                                <td>${e.id}</td>
                                <td>${e.name}</td>
                                <td>${e.username}</td>
                                <td>${e.role === 'admin' ? '⚙️ Admin' : e.role === 'owner' ? '👑 Owner' : '💰 Cashier'}</td>
                                <td>${(e.mustChangePassword || e.must_change_password) ? '<span class="badge-warning">Password required</span>' : '<span class="badge-success">Active</span>'}</td>
                                <td class="action-icons">
                                    <i class="fas fa-edit edit-emp" data-id="${e.id}" style="cursor:pointer;color:#1f5e7a;margin-right:8px;"></i>
                                    <i class="fas fa-trash-alt delete-emp" data-id="${e.id}" style="cursor:pointer;color:#dc2626;"></i>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;

    document.getElementById('addEmployeeBtn')?.addEventListener('click', () => openEmployeeModal());

    document.querySelectorAll('.edit-emp').forEach(btn => {
        btn.addEventListener('click', () => {
            const emp = employees.find(e => e.id == btn.dataset.id);
            if (emp) openEmployeeModal(emp);
        });
    });

    document.querySelectorAll('.delete-emp').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Delete this employee?')) return;
            await fetch(`${API}/employees/${btn.dataset.id}`, { method: 'DELETE' });
            renderEmployeeManagement();
        });
    });
}

function openEmployeeModal(emp = null) {
    document.getElementById('modalTitle').innerText = emp ? 'Edit Employee' : 'Add Employee';
    document.getElementById('employeeId').value = emp?.id || '';
    document.getElementById('empName').value = emp?.name || '';
    document.getElementById('empUsername').value = emp?.username || '';
    document.getElementById('empRole').value = emp?.role || 'cashier';
    document.getElementById('empPassword').value = '';
    document.getElementById('employeeModal').style.display = 'flex';
}

async function saveEmployee() {
    const id = document.getElementById('employeeId').value;
    const body = {
        name: document.getElementById('empName').value.trim(),
        username: document.getElementById('empUsername').value.trim(),
        role: document.getElementById('empRole').value,
        password: document.getElementById('empPassword').value.trim()
    };
    if (!body.name || !body.username) { alert('Please fill all required fields'); return; }
    const url = id ? `${API}/employees/${id}` : `${API}/employees`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.success) {
        document.getElementById('employeeModal').style.display = 'none';
        renderEmployeeManagement();
        alert('Employee saved!');
    } else alert(data.message || 'Error saving employee');
}

async function renderSalesStatement() {
    const sales = await getSales();
    const total = sales.reduce((s, r) => s + parseFloat(r.total_amount || r.amount * r.quantity), 0);
    document.getElementById('adminContent').innerHTML = `
        <div class="card">
            <h3>Sales Statement</h3>
            <p><strong>Total Sales:</strong> ${sales.length}</p>
            <p><strong>Total Revenue:</strong> ${formatCurrency(total)}</p>
            <p><strong>Average Sale:</strong> ${formatCurrency(sales.length ? total / sales.length : 0)}</p>
        </div>`;
}

async function renderCategorySales() {
    const sales = await getSales();
    const map = new Map();
    sales.forEach(s => map.set(s.category, (map.get(s.category) || 0) + parseFloat(s.total_amount || s.amount * s.quantity)));
    document.getElementById('adminContent').innerHTML = `
        <div class="card"><h3>Category Sales</h3>
            ${Array.from(map.entries()).map(([c, v]) => `<p><strong>${c}:</strong> ${formatCurrency(v)}</p>`).join('')}
        </div>`;
}

async function renderProductSales() {
    const sales = await getSales();
    const map = new Map();
    sales.forEach(s => map.set(s.productName, (map.get(s.productName) || 0) + parseFloat(s.total_amount || s.amount * s.quantity)));
    document.getElementById('adminContent').innerHTML = `
        <div class="card"><h3>Product Sales</h3>
            ${Array.from(map.entries()).map(([p, v]) => `<p><strong>${p}:</strong> ${formatCurrency(v)}</p>`).join('')}
        </div>`;
}

async function renderInventoryCategory() {
    const products = await getProducts();
    const map = new Map();
    products.forEach(p => map.set(p.category, (map.get(p.category) || 0) + p.quantity));
    document.getElementById('adminContent').innerHTML = `
        <div class="card"><h3>Inventory by Category</h3>
            ${Array.from(map.entries()).map(([c, q]) => `<p><strong>${c}:</strong> ${q} units</p>`).join('')}
        </div>`;
}

async function renderInventoryStatement() {
    const products = await getProducts();
    const totalValue = products.reduce((s, p) => s + p.quantity * parseFloat(p.price), 0);
    const low = products.filter(p => p.quantity > 0 && p.quantity < 10);
    const out = products.filter(p => p.quantity === 0);
    document.getElementById('adminContent').innerHTML = `
        <div class="card"><h3>Inventory Statement</h3>
            <p><strong>Total Products:</strong> ${products.length}</p>
            <p><strong>Total Units:</strong> ${products.reduce((s, p) => s + p.quantity, 0)}</p>
            <p><strong>Total Value:</strong> ${formatCurrency(totalValue)}</p>
            <p><strong>Low Stock Items:</strong> ${low.length}</p>
            <p><strong>Out of Stock Items:</strong> ${out.length}</p>
        </div>`;
}

async function renderSupplierPerProduct() {
    const products = await getProducts();
    document.getElementById('adminContent').innerHTML = `
        <div class="card"><h3>Supplier per Product</h3>
            ${products.map(p => `<p><strong>${p.name}</strong> - ${p.supplier || '-'} (${p.supplierContact || '-'}) - Price: ${formatCurrency(p.price)}</p>`).join('')}
        </div>`;
}

async function renderSupplierInfo() {
    const products = await getProducts();
    const map = new Map();
    products.forEach(p => { if (!map.has(p.supplier)) map.set(p.supplier, []); map.get(p.supplier).push(p.name); });
    document.getElementById('adminContent').innerHTML = `
        <div class="card"><h3>Supplier Information</h3>
            ${Array.from(map.entries()).map(([s, items]) => `<p><strong>${s}</strong>: ${items.join(', ')}</p>`).join('')}
        </div>`;
}

async function setAdminView(view) {
    const titles = {
        notifications: 'Notifications', 'sales-statement': 'Sales Statement',
        'sales-category': 'Category Sales', 'sales-product': 'Product Sales',
        'inv-category': 'Inventory by Category', 'inv-statement': 'Inventory Statement',
        'inv-product': 'Manage Products', 'inv-supplier': 'Supplier per Product',
        'supplier-info': 'Supplier Information', 'employee-management': 'Employee Management'
    };
    document.getElementById('adminTitle').innerText = titles[view] || 'Dashboard';
    const fns = {
        notifications: renderAdminNotifications, 'sales-statement': renderSalesStatement,
        'sales-category': renderCategorySales, 'sales-product': renderProductSales,
        'inv-category': renderInventoryCategory, 'inv-statement': renderInventoryStatement,
        'inv-product': renderProductManagement, 'inv-supplier': renderSupplierPerProduct,
        'supplier-info': renderSupplierInfo, 'employee-management': renderEmployeeManagement
    };
    if (fns[view]) await fns[view]();
}

document.addEventListener('DOMContentLoaded', () => {
    updateNotificationBadge();
    setAdminView('notifications');

    document.querySelectorAll('[data-admin-view]').forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); setAdminView(link.dataset.adminView); });
    });

    document.querySelectorAll('[data-toggle]').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const sub = document.getElementById(toggle.getAttribute('data-toggle'));
            if (sub) sub.style.display = sub.style.display === 'none' ? 'block' : 'none';
        });
    });

    document.getElementById('adminLogout').addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });

    document.getElementById('closeProductModalBtn')?.addEventListener('click', () => { document.getElementById('productModal').style.display = 'none'; });
    document.getElementById('saveProductBtn')?.addEventListener('click', saveProduct);
    document.getElementById('closeEmployeeModalBtn')?.addEventListener('click', () => { document.getElementById('employeeModal').style.display = 'none'; });
    document.getElementById('saveEmployeeBtn')?.addEventListener('click', saveEmployee);

    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('productModal')) document.getElementById('productModal').style.display = 'none';
        if (e.target === document.getElementById('employeeModal')) document.getElementById('employeeModal').style.display = 'none';
    });
});
