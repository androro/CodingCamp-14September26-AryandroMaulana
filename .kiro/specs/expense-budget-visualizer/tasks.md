# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a fully client-side, zero-dependency SPA with plain HTML, CSS, and Vanilla JavaScript (ES2020+). The build follows a bottom-up approach: utilities and pure-logic modules first, then state and storage, then UI rendering, then the entry-point wiring, and finally optional enhancements (monthly summary, spending limit, dark mode). Each step is independently testable before the next layer is added.

---

## Tasks

- [ ] 1. Project scaffold and tooling setup
  - Create the directory structure: `index.html`, `css/style.css`, `js/` (app.js, state.js, storage.js, ui.js, chart.js, validation.js, categories.js, utils.js), `tests/unit/`, `tests/dom/`, `tests/setup.js`
  - Add `package.json` with `vitest` and `fast-check` as dev dependencies; configure Vitest with a `jsdom` environment for DOM tests and a `node` environment for unit tests
  - Add `tests/setup.js` for jsdom environment config and fast-check global seed
  - _Requirements: 10.4_

- [ ] 2. Implement utility functions (`utils.js`)
  - [ ] 2.1 Implement `formatIDR`, `generateId`, `getLocalDateString`, `getMonthKey`, and `getCategoryColors` as ES Module exports
    - `formatIDR(amount)` → `"Rp 1.250.000"` (integer only, period thousands separator, `"Rp 0"` for zero)
    - `generateId()` → UUID v4-like string
    - `getLocalDateString()` → `"YYYY-MM-DD"` using device local time
    - `getMonthKey(dateStr)` → `"YYYY-MM"` slice of an ISO date string
    - `getCategoryColors(categories)` → deterministic palette of up to 53 unique hex color strings; first three slots reserved for Food, Transport, Fun
    - _Requirements: 2.1, 3.1, 4.4, 6.7, 7.3_

  - [ ]* 2.2 Write property test for `formatIDR` (Property 18)
    - **Property 18: IDR currency formatter produces correct output for all amounts**
    - **Validates: Requirements 2.1, 3.1, 7.3**
    - Use `fc.integer({ min: 0 })` to generate non-negative integers; assert prefix `"Rp "`, period-grouped digits, no decimal point

  - [ ]* 2.3 Write property test for `getCategoryColors` (Property 9)
    - **Property 9: Category color assignment is always unique**
    - **Validates: Requirements 4.4, 6.7**
    - Use `fc.array(fc.string(), { minLength: 1, maxLength: 53 })` (deduplicated); assert result length equals input length and all color values are distinct strings

- [ ] 3. Implement validation module (`validation.js`)
  - [ ] 3.1 Implement `validateTransactionForm`, `validateCustomCategory`, and `validateSpendingLimit` as pure ES Module exports returning `{ valid: true }` or `{ valid: false; errors: Record<string, string> }`
    - `validateTransactionForm`: name non-empty ≤ 100 chars, amount number in [0.01, 999999999.99], category non-empty
    - `validateCustomCategory`: 1–50 non-whitespace-only chars, case-insensitive duplicate check, max-50-entries check
    - `validateSpendingLimit`: number in [0.01, 999999999.99] with at most 2 decimal places
    - _Requirements: 1.4, 1.5, 6.1, 6.4, 6.6, 8.1_

  - [ ]* 3.2 Write property test for `validateTransactionForm` (Property 2)
    - **Property 2: Invalid form input is always rejected**
    - **Validates: Requirements 1.4, 1.5**
    - Generate inputs where at least one field is empty or amount is out-of-range; assert `valid: false` with non-empty error for each offending field; also assert valid inputs return `valid: true`

  - [ ]* 3.3 Write property test for `validateCustomCategory` (Property 12)
    - **Property 12: Custom category validation correctly accepts and rejects inputs**
    - **Validates: Requirements 6.1, 6.4, 6.6**
    - Cover: valid name + empty list → valid; duplicate (case-insensitive) → invalid; whitespace-only → invalid; list already at 50 → invalid

  - [ ]* 3.4 Write property test for `validateSpendingLimit` (Property 16)
    - **Property 16: Spending limit validation accepts in-range values and rejects out-of-range values**
    - **Validates: Requirements 8.1**
    - Use `fc.float` for in-range and out-of-range values; assert correct valid/invalid classification

- [ ] 4. Implement storage module (`storage.js`)
  - [ ] 4.1 Implement `loadFromStorage`, `saveTransactions`, `saveCustomCategories`, `saveSpendingLimit`, and `saveTheme` under storage key `expense_visualizer_v1`
    - All writes wrapped in try/catch; on failure return `false` and dispatch `storage-error` on `window`
    - On load: `JSON.parse` failure or schema-invalid transaction → return `null`
    - Schema validation: each transaction must have non-empty string `id`, `name`, `category`, `date`, and numeric `amount > 0`; one invalid record discards the entire array
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]* 4.2 Write property test for serialization round-trip (Property 10)
    - **Property 10: Transaction serialization round-trip preserves all fields**
    - **Validates: Requirements 5.2, 5.6**
    - Use `fc.array(arbitraryTransaction())` to generate valid transaction arrays; serialize to JSON and parse back; assert deep equality of all fields

  - [ ]* 4.3 Write property test for corrupt storage handling (Property 11)
    - **Property 11: Corrupt or schema-invalid storage data is always discarded safely**
    - **Validates: Requirements 5.4**
    - Generate arbitrary strings (including non-JSON and JSON with missing/wrong-type fields); assert `loadFromStorage` returns `null` without throwing

- [ ] 5. Implement categories module (`categories.js`)
  - [ ] 5.1 Export the built-in category list `['Food', 'Transport', 'Fun']` and any helpers needed by state and UI to merge built-in + custom categories
    - _Requirements: 1.2, 6.5_

- [ ] 6. Implement state manager (`state.js`)
  - [ ] 6.1 Implement in-memory state object with shape `{ transactions, customCategories, spendingLimit, theme, selectedMonth }` and export `getState`, `loadInitialState`, `addTransaction`, `deleteTransaction`, `addCustomCategory`, `setSpendingLimit`, `setTheme`, `setSelectedMonth`
    - `addTransaction` prepends to the array (newest first)
    - `deleteTransaction` removes by id; returns `false` (and does not mutate) if storage write fails
    - `addCustomCategory` appends to `customCategories`
    - _Requirements: 1.3, 2.4, 5.1, 6.2, 6.3_

  - [ ] 6.2 Implement `computeWarningState(total, limit)` as a named export: returns `'none'` | `'near-limit'` | `'exceeded'`
    - `'none'` when `total < 0.9 × limit`; `'near-limit'` when `0.9 × limit ≤ total ≤ limit`; `'exceeded'` when `total > limit`
    - _Requirements: 8.5, 8.6_

  - [ ] 6.3 Implement `deriveCategoryTotals(transactions)` as a named export: returns `Record<string, number>` mapping each category to the sum of amounts for its transactions
    - _Requirements: 4.1_

  - [ ] 6.4 Implement `filterByMonth(transactions, monthKey)` as a named export: returns all transactions when `monthKey` is null; otherwise returns transactions whose `getMonthKey(date) === monthKey`
    - _Requirements: 7.2, 7.6_

  - [ ]* 6.5 Write property test for `addTransaction` (Properties 1 and 3)
    - **Property 1: Valid transaction submission always grows the list**
    - **Property 3: Successful submission resets the form to its initial state** (state-layer assertion: list length +1, new item at index 0)
    - **Validates: Requirements 1.3, 2.1**
    - Use `arbitraryTransaction()` to generate valid inputs; assert list length increases by exactly one and new transaction is at index 0

  - [ ]* 6.6 Write property test for `deleteTransaction` (Property 6)
    - **Property 6: Successful delete removes the transaction; failed write retains it**
    - **Validates: Requirements 2.4**
    - Mock storage write to succeed and to fail; assert presence/absence of transaction accordingly

  - [ ]* 6.7 Write property test for `computeWarningState` (Property 17)
    - **Property 17: Spending limit warning state is correctly classified for all (total, limit) pairs**
    - **Validates: Requirements 8.5, 8.6**
    - Use `fc.float({ min: 0 })` for total and `fc.float({ min: 0.01 })` for limit; assert mutual exclusivity and exhaustiveness of the three cases

  - [ ]* 6.8 Write property test for `deriveCategoryTotals` (Property 8)
    - **Property 8: Category totals map is accurate and complete**
    - **Validates: Requirements 4.1**
    - Generate non-empty transaction arrays; assert every key maps to the correct sum and no spurious keys exist

  - [ ]* 6.9 Write property test for `filterByMonth` (Properties 14 and 15)
    - **Property 14: Monthly filter returns exactly the transactions for the selected month**
    - **Property 15: Month selector range covers all recorded transaction months**
    - **Validates: Requirements 7.2, 7.6, 7.1**
    - Use `fc.array(arbitraryTransaction())` and `fc.option(fc.string())` for month key; assert filtered set equals transactions whose month key matches

  - [ ]* 6.10 Write property test for `addCustomCategory` (Property 13)
    - **Property 13: Custom category addition is reflected in the category list**
    - **Validates: Requirements 6.2**
    - After calling `addCustomCategory` with a valid name, assert the name appears in `getState().customCategories`

- [ ] 7. Checkpoint — pure logic complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement UI renderer (`ui.js`)
  - [ ] 8.1 Implement `renderTransactionList(transactions)`: builds transaction list DOM entries in the order provided (caller is responsible for pre-sorting); each entry shows name, formatted amount, category, and a delete button; shows "no transactions" message for empty input
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

  - [ ] 8.2 Implement `renderBalance(transactions)`: computes and displays `formatIDR(sum of amounts)`; displays `"Rp 0"` for empty input
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 8.3 Implement `renderSpendingWarning(total, limit)`: evaluates `computeWarningState` and shows/hides the near-limit and exceeded-budget indicator elements
    - _Requirements: 8.5, 8.6, 8.7, 8.8_

  - [ ] 8.4 Implement `renderCategorySelector(categories)`: populates the `<select>` with built-in + custom category options; preserves current selection if still valid
    - _Requirements: 1.2, 6.2_

  - [ ] 8.5 Implement `renderMonthSelector(transactions)` and `renderMonthlySummary(transactions, month)`: month selector lists all unique YYYY-MM keys from transactions plus the current month; summary shows filtered total and filtered transaction list
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.7_

  - [ ] 8.6 Implement `showFieldError(fieldId, message)`, `clearFieldErrors()`, and `showGlobalError(message)` for inline and banner error display
    - _Requirements: 1.4, 1.5, 5.5, 6.4_

  - [ ]* 8.7 Write property test for `renderTransactionList` — ordering (Property 4)
    - **Property 4: Transaction list always rendered in newest-first order**
    - **Validates: Requirements 2.1**
    - Use jsdom environment; generate transaction arrays with distinct timestamps; assert DOM entries appear in descending date order

  - [ ]* 8.8 Write property test for `renderTransactionList` — delete button count (Property 5)
    - **Property 5: Delete button count equals transaction count**
    - **Validates: Requirements 2.3**
    - Use jsdom environment; generate arrays of length 0–50; assert number of delete buttons in DOM equals array length

  - [ ]* 8.9 Write property test for `renderBalance` (Property 7)
    - **Property 7: Balance display equals formatted sum of all amounts**
    - **Validates: Requirements 3.1, 3.4**
    - Use jsdom environment; assert displayed text equals `formatIDR(sum)` for arbitrary transaction arrays including the empty array

- [ ] 9. Implement chart manager (`chart.js`)
  - [ ] 9.1 Implement `initChart(canvasId)` and `updateChart(categoryTotals)`: wrap Chart.js pie chart creation and update; render `"No data to display"` text overlay when `categoryTotals` is empty; catch all Chart.js exceptions and log to `console.error`; exit silently if canvas element is missing
    - Load Chart.js from CDN (referenced in `index.html`); do not import it as an ES module
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 10.5_

- [ ] 10. Build HTML shell and CSS (`index.html`, `css/style.css`)
  - [ ] 10.1 Write `index.html`: include Chart.js CDN `<script>` tag (before the module script), mount root structure (balance display, spending limit input, warning indicator, transaction form with name/amount/category inputs and custom category input, month selector, monthly summary section, transaction list, theme toggle), load `js/app.js` as `<script type="module">`
    - _Requirements: 1.1, 1.2, 3.1, 4.1, 7.1, 8.1, 9.1, 10.4, 10.5_

  - [ ] 10.2 Write `css/style.css` with CSS custom properties for light and dark themes (`data-theme="dark"` on `<html>`), responsive layout using flexbox/grid that renders without horizontal scroll from 320px to 1440px+, and WCAG-compliant contrast ratios (≥4.5:1 text, ≥3:1 large text/controls) for both themes
    - _Requirements: 9.1, 9.2, 9.5, 9.6, 10.1, 10.2_

- [ ] 11. Implement entry point and event wiring (`app.js`)
  - [ ] 11.1 On `DOMContentLoaded`: read theme from localStorage and apply it before first paint; call `loadFromStorage` and `loadInitialState`; call `initChart`; render all UI components with initial state
    - _Requirements: 5.1, 9.3, 9.4, 9.5_

  - [ ] 11.2 Wire transaction form submit event: call `clearFieldErrors`, `validateTransactionForm`, show field errors on failure, or call `addTransaction` + `saveTransactions` + re-render balance/list/chart/summary/warning on success
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 2.5, 3.2, 4.2, 8.7_

  - [ ] 11.3 Wire delete button click (event delegation on list container): call `deleteTransaction` + `saveTransactions`; handle storage-write failure by retaining entry and calling `showGlobalError`; re-render balance/list/chart/summary/warning on success
    - _Requirements: 2.3, 2.4, 3.3, 4.2, 5.3, 8.7_

  - [ ] 11.4 Wire custom category form submit: call `validateCustomCategory`, show validation message on failure, or call `addCustomCategory` + `saveCustomCategories` + re-render category selector on success
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ] 11.5 Wire month selector change: call `setSelectedMonth` + re-render monthly summary; wire month selector clear to set month to null
    - _Requirements: 7.2, 7.5, 7.6_

  - [ ] 11.6 Wire spending limit input: on change call `validateSpendingLimit`; on valid value call `setSpendingLimit` + `saveSpendingLimit` + re-render warning; on clear/zero call `setSpendingLimit(null)` + hide warning
    - _Requirements: 8.1, 8.2, 8.7, 8.8_

  - [ ] 11.7 Wire theme toggle: call `setTheme` + `saveTheme` + apply `data-theme` attribute to `<html>` within 100ms
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 11.8 Listen for `storage-error` event on `window` and call `showGlobalError` with a "data could not be saved" message
    - _Requirements: 5.5_

- [ ] 12. Checkpoint — full application wired
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Integration tests (`tests/dom/app.integration.test.js`)
  - [ ]* 13.1 Write integration tests for edge cases: empty list shows no-transactions message; empty dataset shows "Rp 0"; storage write failure shows error banner; theme toggle applies CSS class and persists to localStorage; app init loads theme before render
    - _Requirements: 2.6, 3.4, 5.5, 9.2, 9.3, 9.4_

  - [ ]* 13.2 Write property test for form reset after add (Property 3 — DOM layer)
    - **Property 3: Successful submission resets the form to its initial state**
    - **Validates: Requirements 1.6**
    - Use jsdom environment; for any valid transaction input, assert name and amount inputs are empty and category selector is reset to "Food" after successful submission

- [ ] 14. Final checkpoint — all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All JS files use ES Module syntax (`export`/`import`); `index.html` loads `app.js` with `<script type="module">`
- Chart.js is loaded from CDN and accessed as `window.Chart` — do not import it as an ES module
- Each task references specific requirements for traceability
- Checkpoints at tasks 7 and 12 ensure incremental validation before wiring layers together
- Property tests use fast-check with `fc.` arbitraries; annotate each test with `// Feature: expense-budget-visualizer, Property N: <property text>`
- The `arbitraryTransaction()` helper should be defined in `tests/setup.js` or a shared test utility file and reused across test files

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "5.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "3.4", "4.2", "4.3", "6.1"] },
    { "id": 3, "tasks": ["6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9", "6.10"] },
    { "id": 4, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "9.1"] },
    { "id": 5, "tasks": ["8.7", "8.8", "8.9", "10.1", "10.2"] },
    { "id": 6, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5", "11.6", "11.7", "11.8"] },
    { "id": 7, "tasks": ["13.1", "13.2"] }
  ]
}
```
