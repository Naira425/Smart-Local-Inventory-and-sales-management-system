// ============================================================
// Smart Inventory System - Login Page
// Uses MySQL backend via REST API instead of localStorage
// ============================================================

const API = 'http://localhost:3000/api';

function formatCurrency(amount) {
    return `M${parseFloat(amount).toFixed(2)}`;
}

function showInputError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const container = field?.closest('.input-field');
    if (container) container.classList.add('error-input');
    const msgDiv = document.getElementById('loginMessage');
    msgDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    msgDiv.className = 'message-area error';
    setTimeout(() => {
        if (container) container.classList.remove('error-input');
        if (msgDiv.classList.contains('error')) {
            msgDiv.innerHTML = '<i class="fas fa-info-circle"></i> Enter your credentials to access the system';
            msgDiv.className = 'message-area';
        }
    }, 3000);
}

async function handleLogin(username, password, selectedRole) {
    document.getElementById('usernameField').classList.remove('error-input');
    document.getElementById('passwordField').classList.remove('error-input');

    if (!username) { showInputError('loginUsername', 'Please enter your username'); return; }
    if (!password) { showInputError('loginPassword', 'Please enter your password'); return; }

    try {
        const res = await fetch(`${API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role: selectedRole })
        });
        const data = await res.json();

        if (!data.success) {
            showInputError('loginPassword', data.message || 'Invalid credentials');
            return;
        }

        const user = data.user;

        // Store session info
        sessionStorage.setItem('currentUser', JSON.stringify(user));

        if (user.mustChangePassword || user.must_change_password) {
            showChangePasswordModal(user);
            return;
        }

        if (user.role === 'owner') window.location.href = 'owner.html';
        else if (user.role === 'admin') window.location.href = 'admin.html';
        else if (user.role === 'cashier') window.location.href = 'cashier.html';

    } catch (err) {
        showInputError('loginPassword', 'Cannot connect to server. Is the backend running?');
    }
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

async function changePassword() {
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('passwordError');

    if (!newPass || newPass.length < 4) { errorDiv.innerHTML = 'Password must be at least 4 characters'; return; }
    if (newPass !== confirmPass) { errorDiv.innerHTML = 'Passwords do not match'; return; }

    try {
        const res = await fetch(`${API}/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: pendingUser.id, newPassword: newPass })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('changePasswordModal').style.display = 'none';
            const msgDiv = document.getElementById('loginMessage');
            msgDiv.innerHTML = '<i class="fas fa-check-circle"></i> Password changed! Please login again.';
            msgDiv.className = 'message-area success';
            pendingUser = null;
        }
    } catch (err) {
        errorDiv.innerHTML = 'Server error. Try again.';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    let currentRole = 'cashier';

    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRole = btn.dataset.role;
            const msg = document.getElementById('loginMessage');
            const hints = {
                cashier: 'Cashier: cashier / cashier123 | Employee accounts also available',
                owner: 'Owner: owner / owner123',
                admin: 'Admin: admin / admin123'
            };
            msg.innerHTML = `<i class="fas fa-info-circle"></i> ${hints[currentRole]}`;
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
        if (e.target === document.getElementById('changePasswordModal')) {
            document.getElementById('changePasswordModal').style.display = 'none';
        }
    });
});
