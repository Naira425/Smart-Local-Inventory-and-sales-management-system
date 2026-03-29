// Shared data storage using localStorage
const STORAGE_KEYS = {
    PRODUCTS: 'inventory_products',
    SALES: 'sales_records',
    EMPLOYEES: 'employees'
};

// Initialize default data if not exists
function initializeData() {
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
        const defaultProducts = [
            { id: 1, name: "Wireless Mouse", category: "Electronics", quantity: 5, price: 29.99, supplier: "TechSupply Ltd", supplierContact: "tech@supply.com" },
            { id: 2, name: "Notebook", category: "Stationery", quantity: 3, price: 4.99, supplier: "PaperHub", supplierContact: "orders@paperhub.com" },
            { id: 3, name: "Office Chair", category: "Furniture", quantity: 12, price: 129.99, supplier: "ErgoFurnish", supplierContact: "sales@ergofurnish.com" },
            { id: 4, name: "USB Cable", category: "Electronics", quantity: 0, price: 9.99, supplier: "CableMaster", supplierContact: "support@cablemaster.com" },
            { id: 5, name: "Desk Lamp", category: "Furniture", quantity: 25, price: 45.99, supplier: "ErgoFurnish", supplierContact: "sales@ergofurnish.com" },
            { id: 6, name: "Printer Paper", category: "Stationery", quantity: 2, price: 12.99, supplier: "PaperHub", supplierContact: "orders@paperhub.com" }
        ];
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(defaultProducts));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.SALES)) {
        const defaultSales = [
            { id: 1, productId: 1, productName: "Wireless Mouse", category: "Electronics", amount: 29.99, date: new Date().toISOString().split('T')[0], quantity: 2, timestamp: new Date().toISOString() },
            { id: 2, productId: 2, productName: "Notebook", category: "Stationery", amount: 4.99, date: new Date().toISOString().split('T')[0], quantity: 3, timestamp: new Date().toISOString() }
        ];
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(defaultSales));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
        const defaultEmployees = [
            { id: 1, name: "John Doe", username: "cashier", password: "cashier123", mustChangePassword: false, role: "cashier" },
            { id: 2, name: "Jane Smith", username: "jane", password: "temp123", mustChangePassword: true, role: "cashier" }
        ];
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(defaultEmployees));
    }
}

// Helper functions
function formatCurrency(amount) {
    return `M${amount.toFixed(2)}`;
}

function getEmployees() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || '[]');
}

function saveEmployees(employees) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
}

function showInputError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const container = field.closest('.input-field');
    container.classList.add('error-input');
    const msgDiv = document.getElementById('loginMessage');
    msgDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    msgDiv.className = 'message-area error';
    setTimeout(() => {
        container.classList.remove('error-input');
        if (msgDiv.classList.contains('error')) {
            msgDiv.innerHTML = '<i class="fas fa-info-circle"></i> Enter your credentials to access the system';
            msgDiv.className = 'message-area';
        }
    }, 3000);
}

function handleLogin(username, password, selectedRole) {
    document.getElementById('usernameField').classList.remove('error-input');
    document.getElementById('passwordField').classList.remove('error-input');
    
    if (!username || !password) {
        if (!username) showInputError('loginUsername', 'Please enter your username');
        if (!password) showInputError('loginPassword', 'Please enter your password');
        return false;
    }
    
    if (selectedRole === 'owner') {
        if (username === 'owner' && password === 'owner123') {
            window.location.href = 'owner.html';
            return true;
        } else {
            showInputError('loginPassword', 'Invalid username or password for Owner');
            return false;
        }
    }
    
    if (selectedRole === 'admin' && username === 'admin' && password === 'admin123') {
        window.location.href = 'admin.html';
        return true;
    }
    
    const employees = getEmployees();
    const employee = employees.find(e => e.username === username);
    
    if (!employee) {
        showInputError('loginUsername', 'Username not found. Please check your credentials.');
        return false;
    }
    
    if (employee.password !== password) {
        showInputError('loginPassword', 'Incorrect password. Please try again.');
        return false;
    }
    
    if (employee.mustChangePassword) {
        showChangePasswordModal(employee);
        return true;
    }
    
    if (employee.role === 'cashier') {
        window.location.href = 'cashier.html';
    } else if (employee.role === 'admin') {
        window.location.href = 'admin.html';
    }
    return true;
}

let pendingUser = null;

function showChangePasswordModal(user) {
    pendingUser = user;
    const modal = document.getElementById('changePasswordModal');
    modal.style.display = 'flex';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('passwordError').innerHTML = '';
}

function changePassword() {
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('passwordError');
    
    if (!newPass || newPass.length < 4) {
        errorDiv.innerHTML = 'Password must be at least 4 characters long';
        return;
    }
    if (newPass !== confirmPass) {
        errorDiv.innerHTML = 'Passwords do not match';
        return;
    }
    
    const employees = getEmployees();
    const userIndex = employees.findIndex(e => e.id === pendingUser.id);
    if (userIndex !== -1) {
        employees[userIndex].password = newPass;
        employees[userIndex].mustChangePassword = false;
        saveEmployees(employees);
    }
    
    document.getElementById('changePasswordModal').style.display = 'none';
    const msgDiv = document.getElementById('loginMessage');
    msgDiv.innerHTML = '<i class="fas fa-check-circle"></i> Password changed successfully! Please login again.';
    msgDiv.className = 'message-area success';
    pendingUser = null;
    setTimeout(() => {
        msgDiv.innerHTML = '<i class="fas fa-info-circle"></i> Enter your credentials to access the system';
        msgDiv.className = 'message-area';
    }, 3000);
}

// Initialize data and setup event listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeData();
    
    let currentRole = 'cashier';
    
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRole = btn.dataset.role;
            const msg = document.getElementById('loginMessage');
            if(currentRole === 'cashier') msg.innerHTML = '<i class="fas fa-info-circle"></i> Cashier: cashier / cashier123 | Employee accounts available';
            else if(currentRole === 'owner') msg.innerHTML = '<i class="fas fa-info-circle"></i> Owner: owner / owner123';
            else msg.innerHTML = '<i class="fas fa-info-circle"></i> Admin: admin / admin123';
            msg.className = 'message-area';
        });
    });
    
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin(
            document.getElementById('loginUsername').value.trim(),
            document.getElementById('loginPassword').value,
            currentRole
        );
    });
    
    document.getElementById('changePasswordBtn')?.addEventListener('click', changePassword);
    
    window.addEventListener('click', (e) => {
        if(e.target === document.getElementById('changePasswordModal')) {
            document.getElementById('changePasswordModal').style.display = 'none';
        }
    });
});