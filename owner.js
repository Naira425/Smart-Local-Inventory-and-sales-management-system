// ============================================================
// Smart Inventory System - Owner Dashboard
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

async function renderOwnerSalesSummary() {
    document.getElementById('ownerTitle').innerText = '📊 Sales Summary';
    const sales = await getSales();
    const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.total_amount || s.amount * s.quantity), 0);

    document.getElementById('ownerContent').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><h3>Total Revenue</h3><div class="stat-value">${formatCurrency(totalRevenue)}</div></div>
            <div class="stat-card"><h3>Total Orders</h3><div class="stat-value">${sales.length}</div></div>
        </div>
        <div class="card">
            <h3>Recent Transactions</h3>
            <div class="responsive-table">
                <table>
                    <thead><tr><th>Product</th><th>Category</th><th>Quantity</th><th>Amount</th><th>Date</th></tr></thead>
                    <tbody>
                        ${sales.slice(0, 8).map(s => `
                            <tr>
                                <td>${s.productName}</td>
                                <td>${s.category}</td>
                                <td>${s.quantity}</td>
                                <td>${formatCurrency(s.total_amount || s.amount * s.quantity)}</td>
                                <td>${s.date}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
}

async function renderOwnerInventorySummary() {
    document.getElementById('ownerTitle').innerText = '📦 Inventory Summary';
    const products = await getProducts();
    const totalValue = products.reduce((sum, p) => sum + p.quantity * parseFloat(p.price), 0);
    const totalUnits = products.reduce((sum, p) => sum + p.quantity, 0);

    document.getElementById('ownerContent').innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><h3>Total Products</h3><div class="stat-value">${products.length}</div></div>
            <div class="stat-card"><h3>Total Units</h3><div class="stat-value">${totalUnits}</div></div>
            <div class="stat-card"><h3>Inventory Value</h3><div class="stat-value">${formatCurrency(totalValue)}</div></div>
        </div>
        <div class="card">
            <h3>Current Inventory</h3>
            <div class="responsive-table">
                <table>
                    <thead><tr><th>Product</th><th>Category</th><th>Quantity</th><th>Price</th><th>Value</th></tr></thead>
                    <tbody>
                        ${products.map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.category}</td>
                                <td>${p.quantity}</td>
                                <td>${formatCurrency(p.price)}</td>
                                <td>${formatCurrency(p.quantity * parseFloat(p.price))}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
}

async function renderOwnerSupplierSummary() {
    document.getElementById('ownerTitle').innerText = '🏭 Supplier Details';
    const products = await getProducts();
    const supplierMap = new Map();

    products.forEach(p => {
        if (!supplierMap.has(p.supplier)) supplierMap.set(p.supplier, { contact: p.supplierContact, items: [] });
        supplierMap.get(p.supplier).items.push(p);
    });

    let html = `
        <div class="stats-grid">
            <div class="stat-card"><h3>Total Suppliers</h3><div class="stat-value">${supplierMap.size}</div></div>
        </div>`;

    for (const [sup, data] of supplierMap.entries()) {
        html += `
            <div class="card">
                <h3><i class="fas fa-building"></i> ${sup}</h3>
                <p><i class="fas fa-envelope"></i> ${data.contact || '-'}</p>
                ${data.items.map(i => `<div><strong>${i.name}</strong> - ${i.category} - Price: ${formatCurrency(i.price)} - Stock: ${i.quantity}</div>`).join('')}
            </div>`;
    }
    document.getElementById('ownerContent').innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
    renderOwnerSalesSummary();

    document.querySelectorAll('[data-owner-view]').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('[data-owner-view]').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const view = link.dataset.ownerView;
            if (view === 'sales-summary') renderOwnerSalesSummary();
            else if (view === 'inventory-summary') renderOwnerInventorySummary();
            else if (view === 'supplier-summary') renderOwnerSupplierSummary();
        });
    });

    document.getElementById('ownerLogout').addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });
});
