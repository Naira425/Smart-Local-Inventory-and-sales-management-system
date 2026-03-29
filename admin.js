const STORAGE_KEYS = {
    PRODUCTS: 'inventory_products',
    SALES: 'sales_records',
    EMPLOYEES: 'employees'
};

let nextProductId = 7;
let nextEmployeeId = 3;

function formatCurrency(amount) {
    return `M${amount.toFixed(2)}`;
}

function getProducts() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
}

function saveProducts(products) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

function getSales() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES) || '[]');
}

function getEmployees() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || '[]');
}

function saveEmployees(employees) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
}

function getLowStockItems() {
    const products = getProducts();
    return products.filter(p => p.quantity > 0 && p.quantity < 10);
}

function getOutOfStockItems() {
    const products = getProducts();
    return products.filter(p => p.quantity === 0);
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const totalAlerts = getLowStockItems().length + getOutOfStockItems().length;
    if (badge) {
        badge.textContent = totalAlerts > 0 ? totalAlerts : '';
        badge.style.display = totalAlerts > 0 ? 'inline-block' : 'none';
    }
}

function renderAdminNotifications() {
    const low = getLowStockItems();
    const out = getOutOfStockItems();
    let html = '';
    
    if (out.length) {
        html += `<div class="notification-bar warning"><i class="fas fa-exclamation-triangle"></i><div><strong>OUT OF STOCK:</strong> ${out.map(p => p.name).join(', ')}</div></div>`;
    }
    if (low.length) {
        html += `<div class="notification-bar"><i class="fas fa-box-open"></i><div><strong>LOW STOCK:</strong> ${low.map(p => `${p.name} (${p.quantity} left)`).join(', ')}</div></div>`;
    }
    
    document.getElementById('adminContent').innerHTML = html || '<div class="card">All stock levels are healthy.</div>';
}

function renderProductManagement() {
    const products = getProducts();
    let html = `
        <div class="card">
            <h3>Manage Products</h3>
            <button id="addProductBtn" class="btn-primary" style="margin-bottom:1rem;">+ Add New Product</button>
            <div class="responsive-table">
                <table>
                    <thead>
                        <tr><th>ID</th><th>Name</th><th>Category</th><th>Quantity</th><th>Price (M)</th><th>Supplier</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${products.map(p => `
                            <tr>
                                <td>${p.id}</td>
                                <td><strong>${p.name}</strong></td>
                                <td>${p.category}</td>
                                <td>${p.quantity}</td>
                                <td>${formatCurrency(p.price)}</td>
                                <td>${p.supplier}</td>
                                <td class="action-icons">
                                    <i class="fas fa-edit edit-product" data-id="${p.id}"></i>
                                    <i class="fas fa-trash-alt delete-product" data-id="${p.id}"></i>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    document.getElementById('adminContent').innerHTML = html;
    
    document.getElementById('addProductBtn')?.addEventListener('click', () => openProductModal());
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', () => {
            const productsList = getProducts();
            const product = productsList.find(p => p.id == btn.dataset.id);
            if (product) openProductModal(product);
        });
    });
    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Delete this product?')) {
                let productsList = getProducts();
                productsList = productsList.filter(p => p.id != btn.dataset.id);
                saveProducts(productsList);
                renderProductManagement();
                updateNotificationBadge();
            }
        });
    });
}

function openProductModal(product = null) {
    document.getElementById('productModalTitle').innerText = product ? "Edit Product" : "Add Product";
    document.getElementById('productId').value = product?.id || '';
    document.getElementById('prodName').value = product?.name || '';
    document.getElementById('prodCategory').value = product?.category || '';
    document.getElementById('prodQuantity').value = product?.quantity || '';
    document.getElementById('prodPrice').value = product?.price || '';
    document.getElementById('prodSupplier').value = product?.supplier || '';
    document.getElementById('prodSupplierContact').value = product?.supplierContact || '';
    document.getElementById('productModal').style.display = 'flex';
}

function saveProduct() {
    const id = document.getElementById('productId').value;
    const name = document.getElementById('prodName').value.trim();
    const category = document.getElementById('prodCategory').value.trim();
    const quantity = parseInt(document.getElementById('prodQuantity').value);
    const price = parseFloat(document.getElementById('prodPrice').value);
    const supplier = document.getElementById('prodSupplier').value.trim();
    const contact = document.getElementById('prodSupplierContact').value.trim();
    
    if (!name || !category || isNaN(quantity) || isNaN(price) || !supplier) {
        alert('Please fill all required fields');
        return;
    }
    
    let products = getProducts();
    
    if (id) {
        const index = products.findIndex(p => p.id == id);
        if (index !== -1) {
            products[index] = { ...products[index], name, category, quantity, price, supplier, supplierContact: contact };
        }
    } else {
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 7;
        products.push({ id: newId, name, category, quantity, price, supplier, supplierContact: contact || `info@${supplier.toLowerCase().replace(/\s/g,'')}.com` });
    }
    
    saveProducts(products);
    document.getElementById('productModal').style.display = 'none';
    renderProductManagement();
    updateNotificationBadge();
    alert('Product saved successfully!');
}

function renderEmployeeManagement() {
    const employees = getEmployees();
    let html = `
        <div class="card">
            <h3>Employee Management</h3>
            <button id="addEmployeeBtn" class="btn-primary" style="margin-bottom:1rem;">+ Add New Employee</button>
            <div class="responsive-table">
                <table>
                    <thead>
                        <tr><th>ID</th><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${employees.map(e => `
                            <tr>
                                <td>${e.id}</td>
                                <td>${e.name}</td>
                                <td>${e.username}</td>
                                <td>${e.role === 'admin' ? '⚙️ Admin' : '💰 Cashier'}</td>
                                <td>${e.mustChangePassword ? '<span class="badge-warning">Password required</span>' : '<span class="badge-success">Active</span>'}</td>
                                <td class="action-icons">
                                    <i class="fas fa-edit edit-emp" data-id="${e.id}"></i>
                                    <i class="fas fa-trash-alt delete-emp" data-id="${e.id}"></i>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    document.getElementById('adminContent').innerHTML = html;
    
    document.getElementById('addEmployeeBtn')?.addEventListener('click', () => openEmployeeModal());
    document.querySelectorAll('.edit-emp').forEach(btn => {
        btn.addEventListener('click', () => {
            const employeesList = getEmployees();
            const emp = employeesList.find(e => e.id == btn.dataset.id);
            if (emp) openEmployeeModal(emp);
        });
    });
    document.querySelectorAll('.delete-emp').forEach(btn => {
        btn.addEventListener('click', () => {
            if (confirm('Delete this employee?')) {
                let employeesList = getEmployees();
                employeesList = employeesList.filter(e => e.id != btn.dataset.id);
                saveEmployees(employeesList);
                renderEmployeeManagement();
            }
        });
    });
}

function openEmployeeModal(emp = null) {
    document.getElementById('modalTitle').innerText = emp ? "Edit Employee" : "Add Employee";
    document.getElementById('employeeId').value = emp?.id || '';
    document.getElementById('empName').value = emp?.name || '';
    document.getElementById('empUsername').value = emp?.username || '';
    document.getElementById('empRole').value = emp?.role || 'cashier';
    document.getElementById('empPassword').value = emp ? '' : 'temp123';
    document.getElementById('employeeModal').style.display = 'flex';
}

function saveEmployee() {
    const id = document.getElementById('employeeId').value;
    const name = document.getElementById('empName').value.trim();
    const username = document.getElementById('empUsername').value.trim();
    const role = document.getElementById('empRole').value;
    const password = document.getElementById('empPassword').value.trim();
    
    if (!name || !username) {
        alert('Please fill all required fields');
        return;
    }
    
    let employees = getEmployees();
    
    if (id) {
        const index = employees.findIndex(e => e.id == id);
        if (index !== -1) {
            employees[index].name = name;
            employees[index].username = username;
            employees[index].role = role;
            if (password) employees[index].password = password;
        }
    } else {
        const newId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 3;
        employees.push({ id: newId, name, username, password: password || 'temp123', mustChangePassword: true, role });
    }
    
    saveEmployees(employees);
    document.getElementById('employeeModal').style.display = 'none';
    renderEmployeeManagement();
    alert('Employee saved successfully!');
}

function renderSalesStatement() {
    const sales = getSales();
    const total = sales.reduce((s, r) => s + r.amount * r.quantity, 0);
    document.getElementById('adminContent').innerHTML = `
        <div class="card">
            <h3>Sales Statement</h3>
            <p><strong>Total Sales:</strong> ${sales.length}</p>
            <p><strong>Total Revenue:</strong> ${formatCurrency(total)}</p>
            <p><strong>Average Sale:</strong> ${formatCurrency(sales.length ? total / sales.length : 0)}</p>
        </div>
    `;
}

function renderCategorySales() {
    const sales = getSales();
    let map = new Map();
    sales.forEach(s => map.set(s.category, (map.get(s.category) || 0) + s.amount * s.quantity));
    document.getElementById('adminContent').innerHTML = `
        <div class="card">
            <h3>Category Sales</h3>
            ${Array.from(map.entries()).map(([c, v]) => `<p><strong>${c}:</strong> ${formatCurrency(v)}</p>`).join('')}
        </div>
    `;
}

function renderProductSales() {
    const sales = getSales();
    let map = new Map();
    sales.forEach(s => map.set(s.productName, (map.get(s.productName) || 0) + s.amount * s.quantity));
    document.getElementById('adminContent').innerHTML = `
        <div class="card">
            <h3>Product Sales</h3>
            ${Array.from(map.entries()).map(([p, v]) => `<p><strong>${p}:</strong> ${formatCurrency(v)}</p>`).join('')}
        </div>
    `;
}

function renderInventoryCategory() {
    const products = getProducts();
    let map = new Map();
    products.forEach(p => map.set(p.category, (map.get(p.category) || 0) + p.quantity));
    document.getElementById('adminContent').innerHTML = `
        <div class="card">
            <h3>Inventory by Category</h3>
            ${Array.from(map.entries()).map(([c, q]) => `<p><strong>${c}:</strong> ${q} units</p>`).join('')}
        </div>
    `;
}

function renderInventoryStatement() {
    const products = getProducts();
    const totalValue = products.reduce((s, p) => s + p.quantity * p.price, 0);
    document.getElementById('adminContent').innerHTML = `
        <div class="card">
            <h3>Inventory Statement</h3>
            <p><strong>Total Products:</strong> ${products.length}</p>
            <p><strong>Total Units:</strong> ${products.reduce((s, p) => s + p.quantity, 0)}</p>
            <p><strong>Total Value:</strong> ${formatCurrency(totalValue)}</p>
            <p><strong>Low Stock Items:</strong> ${getLowStockItems().length}</p>
            <p><strong>Out of Stock Items:</strong> ${getOutOfStockItems().length}</p>
        </div>
    `;
}

function renderSupplierPerProduct() {
    const products = getProducts();
    document.getElementById('adminContent').innerHTML = `
        <div class="card">
            <h3>Supplier per Product</h3>
            ${products.map(p => `<p><strong>${p.name}</strong> - ${p.supplier} (${p.supplierContact}) - Price: ${formatCurrency(p.price)}</p>`).join('')}
        </div>
    `;
}

function renderSupplierInfo() {
    const products = getProducts();
    let map = new Map();
    products.forEach(p => {
        if (!map.has(p.supplier)) map.set(p.supplier, []);
        map.get(p.supplier).push(p.name);
    });
    document.getElementById('adminContent').innerHTML = `
        <div class="card">
            <h3>Supplier Information</h3>
            ${Array.from(map.entries()).map(([s, items]) => `<p><strong>${s}</strong>: ${items.join(', ')}</p>`).join('')}
        </div>
    `;
}

function setAdminView(view) {
    const titles = {
        notifications: 'Notifications',
        'sales-statement': 'Sales Statement',
        'sales-category': 'Category Sales',
        'sales-product': 'Product Sales',
        'inv-category': 'Inventory by Category',
        'inv-statement': 'Inventory Statement',
        'inv-product': 'Manage Products',
        'inv-supplier': 'Supplier per Product',
        'supplier-info': 'Supplier Information',
        'employee-management': 'Employee Management'
    };
    document.getElementById('adminTitle').innerText = titles[view] || 'Dashboard';
    
    if (view === 'notifications') renderAdminNotifications();
    else if (view === 'sales-statement') renderSalesStatement();
    else if (view === 'sales-category') renderCategorySales();
    else if (view === 'sales-product') renderProductSales();
    else if (view === 'inv-category') renderInventoryCategory();
    else if (view === 'inv-statement') renderInventoryStatement();
    else if (view === 'inv-product') renderProductManagement();
    else if (view === 'inv-supplier') renderSupplierPerProduct();
    else if (view === 'supplier-info') renderSupplierInfo();
    else if (view === 'employee-management') renderEmployeeManagement();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateNotificationBadge();
    setAdminView('notifications');
    
    document.querySelectorAll('[data-admin-view]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            setAdminView(link.dataset.adminView);
        });
    });
    
    document.querySelectorAll('[data-toggle]').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const sub = document.getElementById(toggle.getAttribute('data-toggle'));
            if (sub) sub.style.display = sub.style.display === 'none' ? 'block' : 'none';
        });
    });
    
    document.getElementById('adminLogout').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    
    document.getElementById('closeProductModalBtn')?.addEventListener('click', () => {
        document.getElementById('productModal').style.display = 'none';
    });
    document.getElementById('saveProductBtn')?.addEventListener('click', saveProduct);
    document.getElementById('closeEmployeeModalBtn')?.addEventListener('click', () => {
        document.getElementById('employeeModal').style.display = 'none';
    });
    document.getElementById('saveEmployeeBtn')?.addEventListener('click', saveEmployee);
    
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('productModal')) {
            document.getElementById('productModal').style.display = 'none';
        }
        if (e.target === document.getElementById('employeeModal')) {
            document.getElementById('employeeModal').style.display = 'none';
        }
    });
});