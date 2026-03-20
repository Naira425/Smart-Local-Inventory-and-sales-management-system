/* ============================================================
   Smart Local Market — Shared JS (app.js)
   ============================================================ */

const API = "http://localhost:5000/api";

/* ─────────────────────────────────────────
   API Helper
   ───────────────────────────────────────── */
async function apiFetch(path, method = "GET", body = null) {
  const opts = {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(API + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  } catch (err) {
    throw err;
  }
}

/* ─────────────────────────────────────────
   Auth Helpers — stored in localStorage
   ───────────────────────────────────────── */
function getMe() {
  const stored = localStorage.getItem("market_user");
  if (!stored) return null;
  try { return JSON.parse(stored); }
  catch { return null; }
}

function requireAuth() {
  const user = getMe();
  if (!user) {
    window.location.href = "index.html";
    return null;
  }
  return user;
}

function logout() {
  localStorage.removeItem("market_user");
  apiFetch("/logout", "POST").catch(() => {});
  window.location.href = "index.html";
}

/* ─────────────────────────────────────────
   Render Sidebar User Info
   ───────────────────────────────────────── */
function renderSidebarUser(user) {
  const nameEl   = document.getElementById("sidebarUserName");
  const roleEl   = document.getElementById("sidebarUserRole");
  const avatarEl = document.getElementById("sidebarAvatar");
  if (nameEl)   nameEl.textContent   = user.full_name;
  if (roleEl)   roleEl.textContent   = user.role;
  if (avatarEl) avatarEl.textContent = user.full_name.charAt(0).toUpperCase();

  if (user.role !== "admin") {
    document.querySelectorAll(".admin-only").forEach(el => el.style.display = "none");
  }
  if (user.role === "cashier") {
    document.querySelectorAll(".no-cashier").forEach(el => el.style.display = "none");
  }
}

/* ─────────────────────────────────────────
   Toast Notifications
   ───────────────────────────────────────── */
function toast(message, type = "success") {
  const icons = { success: "✓", error: "✕", warning: "⚠" };
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerHTML = `<span style="font-size:1rem">${icons[type] || "•"}</span> ${message}`;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transition = "opacity .3s";
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

/* ─────────────────────────────────────────
   Modal Helpers
   ───────────────────────────────────────── */
function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.add("open");
}
function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove("open");
}
document.addEventListener("click", e => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.remove("open");
  }
});

/* ─────────────────────────────────────────
   Format Helpers
   ───────────────────────────────────────── */
function formatMoney(val) {
  return "M " + parseFloat(val || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDate(str) {
  if (!str) return "—";
  const d = new Date(str);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(str) {
  if (!str) return "—";
  const d = new Date(str);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
         " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(str) {
  if (!str) return "";
  const diff = Date.now() - new Date(str).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ─────────────────────────────────────────
   Badges
   ───────────────────────────────────────── */
function stockBadge(qty, threshold) {
  if (qty === 0) return `<span class="badge badge-red">Out of Stock</span>`;
  if (qty <= threshold) return `<span class="badge badge-orange">Low: ${qty}</span>`;
  return `<span class="badge badge-green">${qty}</span>`;
}

function roleBadge(role) {
  const map = { admin: "badge-red", cashier: "badge-blue", storekeeper: "badge-orange" };
  return `<span class="badge ${map[role] || 'badge-gray'}">${role}</span>`;
}

function paymentBadge(method) {
  const map = { cash: "badge-green", card: "badge-blue", mobile_money: "badge-orange" };
  return `<span class="badge ${map[method] || 'badge-gray'}">${(method || "").replace("_", " ")}</span>`;
}
