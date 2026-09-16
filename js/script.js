/**
 * Expense & Budget Visualizer — script.js
 * ─────────────────────────────────────────────────────────────
 * MVP Features:
 *   1. Transaction Form  — name, amount, category + validation
 *   2. Transaction List  — display, delete, Local Storage sync
 *   3. Total Balance     — live update, IDR (Rupiah) format
 *   4. Pie Chart         — Chart.js, live update, empty-state safe
 *   5. Local Storage     — persist, load on refresh, error-safe
 *
 * Optional Features (exactly 3):
 *   A. Custom Categories  — free-text category via "Custom…" option
 *   B. Sort Transactions  — Newest · Oldest · Amount Low↑High · High↓Low · Category A–Z
 *   C. Dark / Light Mode  — toggle + persist in Local Storage
 *
 * Audit fixes applied:
 *   - Custom category input is cleared AND hidden when switching away from "Custom"
 *   - Amount validated with isFinite() guard against Infinity / excessively large values
 *   - Chart canvas starts hidden in HTML; JS explicitly shows/hides it each render
 *   - All custom categories map to badge-custom (valid CSS class, never an unknown slug)
 */

'use strict';

/* ── Local Storage Keys ─────────────────────────────────────── */
const STORAGE_KEY_TRANSACTIONS = 'bv_transactions';
const STORAGE_KEY_THEME        = 'bv_theme';

/* ── DOM References ─────────────────────────────────────────── */
const form                = document.getElementById('transactionForm');
const itemNameInput       = document.getElementById('itemName');
const amountInput         = document.getElementById('amount');
const categorySelect      = document.getElementById('category');
const customCategoryInput = document.getElementById('customCategory');
const itemNameError       = document.getElementById('itemNameError');
const amountError         = document.getElementById('amountError');
const categoryError       = document.getElementById('categoryError');
const totalAmountEl       = document.getElementById('totalAmount');
const transactionList     = document.getElementById('transactionList');
const emptyState          = document.getElementById('emptyState');
const sortSelect          = document.getElementById('sortSelect');
const themeToggleBtn      = document.getElementById('themeToggleBtn');
const themeIcon           = document.getElementById('themeIcon');
const chartEmpty          = document.getElementById('chartEmpty');
const expenseCanvas       = document.getElementById('expenseChart');

/* ── App State ──────────────────────────────────────────────── */
let transactions  = [];   // Array<{ id, name, amount, category, date }>
let chartInstance = null; // Chart.js singleton

/* ══════════════════════════════════════════════════════════════
   LOCAL STORAGE HELPERS
   ══════════════════════════════════════════════════════════════ */

/**
 * Load and validate transactions from Local Storage.
 * Returns an empty array if data is missing, malformed, or invalid.
 */
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Keep only records that match the expected shape
    return parsed.filter(
      (t) =>
        t !== null &&
        typeof t.id       === 'string' &&
        typeof t.name     === 'string' &&
        typeof t.amount   === 'number' &&
        isFinite(t.amount) &&          // reject Infinity / NaN stored values
        t.amount >= 0 &&
        typeof t.category === 'string' &&
        typeof t.date     === 'string'
    );
  } catch {
    return [];
  }
}

/** Persist the current transactions array to Local Storage. */
function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.warn('Could not save to Local Storage:', e);
  }
}

/** Load the saved theme ('light' | 'dark'). Defaults to 'light'. */
function loadTheme() {
  const stored = localStorage.getItem(STORAGE_KEY_THEME);
  return stored === 'dark' ? 'dark' : 'light';
}

/** Persist the active theme preference. */
function saveTheme(theme) {
  localStorage.setItem(STORAGE_KEY_THEME, theme);
}

/* ══════════════════════════════════════════════════════════════
   FORMATTING HELPERS
   ══════════════════════════════════════════════════════════════ */

/** Format a number as Indonesian Rupiah — e.g. "Rp 25.000". */
function formatRupiah(amount) {
  return 'Rp\u00a0' + Math.round(amount).toLocaleString('id-ID');
}

/** Generate a collision-resistant unique ID. */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Return the CSS badge modifier class for a given category.
 * Built-in categories get their own colour; every other value
 * (i.e. all custom categories) maps to 'custom' — a valid CSS
 * class that is always defined in style.css.
 *
 * Audit fix: no unknown badge slug can ever be produced.
 */
function badgeClass(category) {
  const map = { Food: 'food', Transport: 'transport', Fun: 'fun' };
  return 'badge badge-' + (map[category] || 'custom');
}

/** Format a stored "YYYY-MM-DD" string to a localised short date. */
function formatDate(dateStr) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/** Escape HTML special characters to prevent XSS in innerHTML. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Return today's date as a "YYYY-MM-DD" string. */
function todayString() {
  return new Date().toISOString().slice(0, 10);
}

/* ══════════════════════════════════════════════════════════════
   OPTIONAL FEATURE C — DARK / LIGHT MODE TOGGLE
   ══════════════════════════════════════════════════════════════ */

/** Apply a theme and update the toggle icon. */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

themeToggleBtn.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  saveTheme(next);
  // Redraw chart so border/legend colours update for the new theme
  renderChart();
});

/* ══════════════════════════════════════════════════════════════
   FORM VALIDATION
   ══════════════════════════════════════════════════════════════ */

/** Remove all inline validation error states. */
function clearErrors() {
  itemNameError.textContent  = '';
  amountError.textContent    = '';
  categoryError.textContent  = '';
  itemNameInput.classList.remove('invalid');
  amountInput.classList.remove('invalid');
  categorySelect.classList.remove('invalid');
  customCategoryInput.classList.remove('invalid');
}

/**
 * Validate the add-transaction form.
 * Returns { valid: true, name, amount, category } on success,
 * or  { valid: false } and populates inline error messages on failure.
 *
 * Audit fix: amount is checked with isFinite() to reject Infinity
 * and values beyond a safe upper bound (999,999,999,999).
 */
function validateForm() {
  clearErrors();
  let valid = true;

  // ── Name ──────────────────────────────────────────────────
  const name = itemNameInput.value.trim();
  if (!name) {
    itemNameError.textContent = 'Item name is required.';
    itemNameInput.classList.add('invalid');
    valid = false;
  }

  // ── Amount ────────────────────────────────────────────────
  const rawAmount = amountInput.value.trim();
  const amount    = parseFloat(rawAmount);
  const MAX_AMOUNT = 999_999_999_999;

  if (rawAmount === '' || isNaN(amount)) {
    amountError.textContent = 'Enter a valid amount.';
    amountInput.classList.add('invalid');
    valid = false;
  } else if (!isFinite(amount) || amount < 0) {
    amountError.textContent = 'Amount must be 0 or more.';
    amountInput.classList.add('invalid');
    valid = false;
  } else if (amount > MAX_AMOUNT) {
    amountError.textContent = 'Amount is too large.';
    amountInput.classList.add('invalid');
    valid = false;
  }

  // ── Category ──────────────────────────────────────────────
  const selectedCat = categorySelect.value;
  let category = selectedCat;

  if (!selectedCat) {
    categoryError.textContent = 'Please select a category.';
    categorySelect.classList.add('invalid');
    valid = false;
  } else if (selectedCat === 'Custom') {
    const custom = customCategoryInput.value.trim();
    if (!custom) {
      categoryError.textContent = 'Enter a custom category name.';
      customCategoryInput.classList.add('invalid');
      valid = false;
    } else {
      // The stored category is the user-supplied name; badgeClass() will
      // map it to badge-custom because it is not in the built-in map.
      category = custom;
    }
  }

  if (!valid) return { valid: false };
  return { valid: true, name, amount, category };
}

/* ── Optional Feature A: show/hide custom category input ──── */
/*
 * Audit fix: when the user switches AWAY from "Custom", the input
 * is both hidden AND cleared, preventing stale values from leaking
 * into subsequent submissions.
 */
categorySelect.addEventListener('change', () => {
  if (categorySelect.value === 'Custom') {
    customCategoryInput.classList.remove('hidden');
    customCategoryInput.focus();
  } else {
    // Hide and clear — prevents stale custom value being submitted
    customCategoryInput.classList.add('hidden');
    customCategoryInput.value = '';
  }
  // Reset validation state on every category change
  categoryError.textContent = '';
  categorySelect.classList.remove('invalid');
  customCategoryInput.classList.remove('invalid');
});

/* ── Form submit ────────────────────────────────────────────── */
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const result = validateForm();
  if (!result.valid) return;

  const transaction = {
    id:       generateId(),
    name:     result.name,
    amount:   result.amount,
    category: result.category,
    date:     todayString(),
  };

  transactions.unshift(transaction); // prepend so default sort = newest first
  saveTransactions();

  // Reset form; ensure custom input is hidden and cleared
  form.reset();
  customCategoryInput.classList.add('hidden');
  customCategoryInput.value = '';

  renderAll();
  itemNameInput.focus();
});

/* ══════════════════════════════════════════════════════════════
   OPTIONAL FEATURE B — SORT TRANSACTIONS
   ══════════════════════════════════════════════════════════════ */

/**
 * Return a sorted copy of the given list according to the current
 * value of the sort dropdown. The original array is never mutated.
 */
function getSorted(list) {
  const mode = sortSelect.value;
  const copy = [...list];

  switch (mode) {
    case 'date-asc':
      return copy.sort((a, b) => a.date.localeCompare(b.date));
    case 'amount-asc':
      return copy.sort((a, b) => a.amount - b.amount);
    case 'amount-desc':
      return copy.sort((a, b) => b.amount - a.amount);
    case 'category-asc':
      return copy.sort((a, b) => a.category.localeCompare(b.category));
    case 'date-desc':
    default:
      return copy.sort((a, b) => b.date.localeCompare(a.date));
  }
}

sortSelect.addEventListener('change', renderTransactionList);

/* ══════════════════════════════════════════════════════════════
   TRANSACTION LIST RENDERING
   ══════════════════════════════════════════════════════════════ */

function renderTransactionList() {
  const sorted = getSorted(transactions);

  if (sorted.length === 0) {
    emptyState.classList.remove('hidden');
    transactionList.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');

  transactionList.innerHTML = sorted.map((t) => `
    <li class="transaction-item" data-id="${t.id}">
      <div class="item-info">
        <span class="item-name" title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</span>
        <span class="item-meta">
          <span class="${badgeClass(t.category)}">${escapeHtml(t.category)}</span>
          <span>${formatDate(t.date)}</span>
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <span class="item-amount">${formatRupiah(t.amount)}</span>
        <button
          class="btn-danger"
          aria-label="Delete ${escapeHtml(t.name)}"
          onclick="deleteTransaction('${t.id}')"
        >✕ Delete</button>
      </div>
    </li>
  `).join('');
}

/* ── Delete handler (exposed globally for inline onclick) ───── */
window.deleteTransaction = function (id) {
  transactions = transactions.filter((t) => t.id !== id);
  saveTransactions();
  renderAll();
};

/* ══════════════════════════════════════════════════════════════
   TOTAL BALANCE
   ══════════════════════════════════════════════════════════════ */

function renderTotal() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  totalAmountEl.textContent = formatRupiah(total);
}

/* ══════════════════════════════════════════════════════════════
   PIE CHART  (Chart.js)
   ══════════════════════════════════════════════════════════════ */

/** Aggregate transaction amounts by category → { category: total }. */
function getCategoryTotals() {
  return transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
}

/** Map category index → colour from a fixed palette. */
const PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#3b82f6', '#ec4899', '#14b8a6', '#f97316',
  '#8b5cf6', '#84cc16',
];

function getColors(count) {
  return Array.from({ length: count }, (_, i) => PALETTE[i % PALETTE.length]);
}

/**
 * Render (or update) the pie chart.
 *
 * Audit fix: the canvas element starts with class="hidden" in the HTML,
 * so on first load with no transactions it is never visible. This function
 * always explicitly sets the canvas and empty-state visibility on every call.
 */
function renderChart() {
  const isDark  = document.documentElement.getAttribute('data-theme') === 'dark';
  const totals  = getCategoryTotals();
  const labels  = Object.keys(totals);
  const data    = Object.values(totals);

  if (labels.length === 0) {
    // No transactions — hide canvas, show placeholder text
    expenseCanvas.classList.add('hidden');
    chartEmpty.classList.remove('hidden');
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  // Has data — show canvas, hide placeholder
  expenseCanvas.classList.remove('hidden');
  chartEmpty.classList.add('hidden');

  const chartData = {
    labels,
    datasets: [{
      data,
      backgroundColor: getColors(labels.length),
      borderWidth: 2,
      borderColor: isDark ? '#1e293b' : '#ffffff',
      hoverOffset: 10,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 14,
          font: { size: 12, family: "'Segoe UI', system-ui, sans-serif" },
          color: isDark ? '#94a3b8' : '#64748b',
          boxWidth: 12,
          boxHeight: 12,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const val   = context.parsed;
            const sum   = context.dataset.data.reduce((a, b) => a + b, 0);
            const pct   = ((val / sum) * 100).toFixed(1);
            return ` ${formatRupiah(val)} (${pct}%)`;
          },
        },
      },
    },
  };

  if (chartInstance) {
    // Update in place to avoid flicker
    chartInstance.data    = chartData;
    chartInstance.options = chartOptions;
    chartInstance.update();
  } else {
    chartInstance = new Chart(expenseCanvas.getContext('2d'), {
      type: 'pie',
      data: chartData,
      options: chartOptions,
    });
  }
}

/* ══════════════════════════════════════════════════════════════
   MASTER RENDER
   ══════════════════════════════════════════════════════════════ */

function renderAll() {
  renderTransactionList();
  renderTotal();
  renderChart();
}

/* ══════════════════════════════════════════════════════════════
   INITIALISATION
   ══════════════════════════════════════════════════════════════ */

function init() {
  // 1. Restore theme before painting anything (prevents flash)
  applyTheme(loadTheme());

  // 2. Load persisted transactions
  transactions = loadTransactions();

  // 3. Render UI
  renderAll();
}

init();
