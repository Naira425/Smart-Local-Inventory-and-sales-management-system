// ============================================================
// Smart Inventory System - Cashier Dashboard
// Uses MySQL backend via REST API
// ============================================================

const API = 'http://localhost:3000/api';

function formatCurrency(amount) {
    return `M${parseFloat(amount).toFixed(2)}`;
}

function getCurrentUser() {
    try { return JSON.parse(sessionStorage.getItem('currentUser')); } catch { return null; }
}

async function getProducts() {
    const res = await fetch(`${API}/products`);
    return res.json();
}

async function getTodaySales() {
    const res = await fetch(`${API}/sales/today`);
    return res.json();
}

async function renderCashierRecordSale() {
    const products = await getProducts();
    let html = `
        <div class="sale-form">
            <h3>New Sale Transaction</h3>
            <div class="form-row">
                <label>Select Product</label>
                <select id="productSelect">
                    <option value="">-- Choose Product --</option>
                    ${products.map(p => `<option value="${p.id}" data-price="${p.price}" ${p.quantity === 0 ? 'disabled' : ''}>${p.name} - ${formatCurrency(p.price)} (Stock: ${p.quantity})</option>`).join('')}
                </select>
            </div>
            <div class="form-row">
                <label>Quantity</label>
                <input type="number" id="saleQuantity" min="1" value="1">
            </div>
            <div class="form-row">
                <label>Total Amount</label>
                <input type="text" id="totalAmount" readonly style="background:#f1f5f9; font-weight:bold;">
            </div>
            <button class="btn-primary btn-success" id="processSaleBtn">Process Sale</button>
        </div>
        <div class="card">
            <h3>Available Inventory</h3>
            <div class="responsive-table">
                <table>
                    <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th></tr></thead>
                    <tbody>
                        ${products.map(p => `<tr><td><strong>${p.name}</strong></td><td>${p.category}</td><td>${formatCurrency(p.price)}</td><td>${p.quantity}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    document.getElementById('cashierContent').innerHTML = html;

    const productSelect = document.getElementById('productSelect');
    const quantityInput = document.getElementById('saleQuantity');
    const totalAmount = document.getElementById('totalAmount');

    function updateTotal() {
        const opt = productSelect.options[productSelect.selectedIndex];
        if (productSelect.value && opt && !opt.disabled) {
            const price = parseFloat(opt.dataset.price);
            const qty = parseInt(quantityInput.value) || 0;
            totalAmount.value = formatCurrency(price * qty);
        } else { totalAmount.value = 'M0.00'; }
    }

    productSelect.addEventListener('change', updateTotal);
    quantityInput.addEventListener('input', updateTotal);

    document.getElementById('processSaleBtn').addEventListener('click', async () => {
        const productId = parseInt(productSelect.value);
        const quantity = parseInt(quantityInput.value);
        if (!productId || quantity < 1) { alert('Please select a product and valid quantity'); return; }

        const user = getCurrentUser();
        const res = await fetch(`${API}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, quantity, cashierId: user?.id || null })
        });
        const result = await res.json();
        alert(result.message);
        if (result.success) renderCashierRecordSale();
    });

    updateTotal();
}

async function renderCashierTodaySales() {
    const todaySales = await getTodaySales();
    const total = todaySales.reduce((s, r) => s + parseFloat(r.total_amount || r.amount * r.quantity), 0);
    const totalItems = todaySales.reduce((s, r) => s + r.quantity, 0);

    document.getElementById('cashierContent').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><h3>Today's Revenue</h3><div class="stat-value">${formatCurrency(total)}</div></div>
            <div class="stat-card"><h3>Items Sold</h3><div class="stat-value">${totalItems}</div></div>
            <div class="stat-card"><h3>Transactions</h3><div class="stat-value">${todaySales.length}</div></div>
        </div>
        <div class="card">
            <h3>Today's Sales Transactions</h3>
            <div class="responsive-table">
                <table>
                    <thead><tr><th>Time</th><th>Product</th><th>Category</th><th>Quantity</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>
                        ${todaySales.length === 0
                            ? '<tr><td colspan="6" style="text-align:center;">No sales recorded today</td></tr>'
                            : todaySales.map(s => `
                                <tr>
                                    <td>${new Date(s.timestamp).toLocaleTimeString()}</td>
                                    <td>${s.productName}</td>
                                    <td>${s.category}</td>
                                    <td>${s.quantity}</td>
                                    <td>${formatCurrency(s.amount)}</td>
                                    <td><strong>${formatCurrency(s.total_amount || s.amount * s.quantity)}</strong></td>
                                </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
}

async function renderCashierInventoryStatus() {
    const products = await getProducts();
    const totalUnits = products.reduce((s, p) => s + p.quantity, 0);

    document.getElementById('cashierContent').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><h3>Total Products</h3><div class="stat-value">${products.length}</div></div>
            <div class="stat-card"><h3>Total Units</h3><div class="stat-value">${totalUnits}</div></div>
        </div>
        <div class="card">
            <h3>Current Inventory Status</h3>
            <div class="responsive-table">
                <table>
                    <thead><tr><th>Product</th><th>Category</th><th>Unit Price</th><th>Current Stock</th><th>Supplier</th></tr></thead>
                    <tbody>
                        ${products.map(p => `
                            <tr>
                                <td><strong>${p.name}</strong></td>
                                <td>${p.category}</td>
                                <td>${formatCurrency(p.price)}</td>
                                <td>${p.quantity}</td>
                                <td>${p.supplier || '-'}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
}

document.addEventListener('DOMContentLoaded', () => {
    renderCashierRecordSale();

    document.querySelectorAll('[data-cashier-view]').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('[data-cashier-view]').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const view = link.dataset.cashierView;
            const titles = { 'record-sale': 'Record Sale', 'today-sales': "Today's Sales", 'inventory-status': 'Inventory Status' };
            document.getElementById('cashierTitle').innerText = titles[view] || view;
            if (view === 'record-sale') renderCashierRecordSale();
            else if (view === 'today-sales') renderCashierTodaySales();
            else if (view === 'inventory-status') renderCashierInventoryStatus();
        });
    });

    document.getElementById('cashierLogout').addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
});
