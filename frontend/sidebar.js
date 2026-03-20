/* ============================================================
   sidebar.js — injects sidebar + topbar HTML into every page
   ============================================================ */

function buildLayout(pageTitle, activeNav) {
  const sidebarHtml = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon">🛒</div>
        <div>
          <span>MarketPro</span>
          <small>Inventory & Sales</small>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-label">Main</div>
        <a href="dashboard.html" class="nav-link ${activeNav==='dashboard'?'active':''}">
          <span class="icon">📊</span> Dashboard
        </a>
        <a href="sales.html" class="nav-link ${activeNav==='sales'?'active':''}">
          <span class="icon">🧾</span> Point of Sale
        </a>
        <a href="sales-history.html" class="nav-link ${activeNav==='history'?'active':''}">
          <span class="icon">📋</span> Sales History
        </a>

        <div class="nav-label">Inventory</div>
        <a href="products.html" class="nav-link ${activeNav==='products'?'active'+'no-cashier':''}">
          <span class="icon">📦</span> Products
        </a>
        <a href="suppliers.html" class="nav-link no-cashier ${activeNav==='suppliers'?'active':''}">
          <span class="icon">🚚</span> Suppliers
        </a>
        <a href="customers.html" class="nav-link ${activeNav==='customers'?'active':''}">
          <span class="icon">👥</span> Customers
        </a>

        <div class="nav-label">Analysis</div>
        <a href="reports.html" class="nav-link ${activeNav==='reports'?'active':''}">
          <span class="icon">📈</span> Reports
        </a>

        <div class="nav-label admin-only">Admin</div>
        <a href="employees.html" class="nav-link admin-only ${activeNav==='employees'?'active':''}">
          <span class="icon">🔑</span> Employees
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar" id="sidebarAvatar">?</div>
          <div class="user-info">
            <div class="name" id="sidebarUserName">Loading...</div>
            <div class="role" id="sidebarUserRole">—</div>
          </div>
          <button class="btn-logout" title="Logout" onclick="logout()">⏻</button>
        </div>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <button class="btn btn-ghost btn-icon" id="menuToggle" onclick="toggleSidebar()" style="display:none">☰</button>
        <div class="topbar-title">${pageTitle}</div>
        <div class="topbar-actions" id="topbarActions"></div>
      </header>
      <div class="content" id="pageContent">
        <div style="display:flex;align-items:center;justify-content:center;padding:80px">
          <span class="spinner"></span>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("afterbegin", sidebarHtml);
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}

// Show hamburger on mobile
if (window.innerWidth <= 900) {
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("menuToggle");
    if (btn) btn.style.display = "flex";
  });
}
