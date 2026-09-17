# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal spending by adding and managing transactions, visualizing category-level spending distribution via a pie chart, and monitoring a running total balance — all without a backend. Data persists across sessions using the browser's Local Storage API. The application is built with plain HTML, CSS, and Vanilla JavaScript, uses Chart.js for visualization, and must be deployable to GitHub Pages.

Three optional enhancements are included beyond the MVP: a spending limit warning system, a monthly summary view, and a dark/light mode toggle.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense record consisting of an item name, amount, and category.
- **Transaction_Form**: The UI form used to input and submit new transactions.
- **Transaction_List**: The scrollable UI component that renders all saved transactions.
- **Balance_Display**: The UI element at the top of the page that shows total spending.
- **Pie_Chart**: The Chart.js-powered visualization showing spending distribution by category.
- **Storage**: The browser's Local Storage API used to persist transaction data.
- **Category**: A label assigned to each transaction. Built-in values are Food, Transport, and Fun. Users may also add custom categories.
- **Custom_Category**: A user-defined category name beyond the built-in set.
- **Spending_Limit**: A user-configurable maximum total spending threshold used to trigger a warning.
- **Monthly_Summary**: A filtered view of transactions scoped to a single calendar month.
- **Theme**: The visual color scheme of the App, either light mode or dark mode.
- **IDR**: Indonesian Rupiah, the currency format used throughout the App (prefix: Rp).

---

## Requirements

### Requirement 1: Transaction Form

**User Story:** As a user, I want to fill in a form with an item name, amount, and category so that I can record a new expense transaction.

#### Acceptance Criteria

1. THE Transaction_Form SHALL include a text input for the item name (maximum 100 characters), a numeric input for the amount, and a category selector.
2. THE Transaction_Form SHALL include the built-in categories Food, Transport, and Fun as selectable options in the category selector, with Food as the default selected option.
3. WHEN the user submits the Transaction_Form with all fields filled and a valid amount between 0.01 and 999,999,999.99, THE App SHALL add the transaction to the transaction data set without reloading the page.
4. WHEN the user submits the Transaction_Form with any field left empty, THE App SHALL display an inline validation error adjacent to each empty field and SHALL NOT add a transaction.
5. WHEN the user submits the Transaction_Form with an amount that is not a number in the range 0.01 to 999,999,999.99, THE App SHALL display an inline validation error adjacent to the amount field and SHALL NOT add a transaction.
6. WHEN a transaction is successfully added, THE Transaction_Form SHALL clear the item name and amount fields and reset the category selector to Food.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my transactions in a scrollable list so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all transactions in descending order by date added (newest first), showing the item name, amount formatted as "Rp X" with dot-separated thousands (e.g., Rp 1.250.000), and category for each entry.
2. THE Transaction_List SHALL be vertically scrollable when the number of transactions exceeds the visible area.
3. THE Transaction_List SHALL include a delete button for each transaction entry.
4. WHEN the user clicks the delete button on a transaction, THE App SHALL first persist the updated transaction data set to Storage and then remove that transaction entry from the Transaction_List display; if the Storage write fails, THE App SHALL retain the transaction in the list and display an error message.
5. WHEN a new transaction is added, THE Transaction_List SHALL render the new entry at the top of the list without requiring a page reload.
6. WHEN the transaction data set is empty, THE Transaction_List SHALL display a message indicating no transactions have been recorded.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my total spending prominently at the top of the page so that I can track how much I have spent overall.

#### Acceptance Criteria

1. THE Balance_Display SHALL be the first visible element in the page content area and SHALL show the sum of all transaction amounts formatted as "Rp X" with a period as the thousands separator and no decimal places (e.g., Rp 1.250.000).
2. WHEN a transaction is added, THE Balance_Display SHALL update to reflect the new total within 1 second without a page reload.
3. WHEN a transaction is deleted, THE Balance_Display SHALL update to reflect the reduced total within 1 second without a page reload.
4. WHEN the transaction data set is empty, THE Balance_Display SHALL show a total of Rp 0.

---

### Requirement 4: Pie Chart Visualization

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Pie_Chart SHALL use Chart.js to render a pie chart showing the proportion of total spending for each category that has at least one transaction.
2. WHEN a transaction is added or deleted, THE Pie_Chart SHALL update automatically within 1 second to reflect the current category totals without a page reload.
3. WHEN the transaction data set is empty, THE Pie_Chart SHALL render without errors and SHALL display a visible text message indicating there is no data to display.
4. THE Pie_Chart SHALL assign a unique color to each category such that no two categories share the same color, and SHALL include a legend identifying each category by name and its percentage of total spending.

---

### Requirement 5: Local Storage Persistence

**User Story:** As a user, I want my transactions to be saved so that my data persists when I close and reopen the browser tab.

#### Acceptance Criteria

1. WHEN the App initializes, THE Storage SHALL be read to load any previously saved transactions before rendering the Transaction_List, Balance_Display, and Pie_Chart.
2. WHEN a transaction is added, THE App SHALL serialize the updated transaction data set and write it to Storage within 100 milliseconds, where the serialized data includes all transaction fields (id, name, amount, category, and date) for every transaction in the current data set.
3. WHEN a transaction is deleted, THE App SHALL serialize the updated transaction data set and write it to Storage within 100 milliseconds, where the serialized data reflects the transaction data set after the deleted transaction has been removed.
4. IF Storage contains data that cannot be parsed as valid JSON or does not conform to the expected transaction schema (each transaction must have a non-empty string id, a non-empty string name, a numeric amount greater than 0, a non-empty string category, and a non-empty string date), THEN THE App SHALL discard the invalid data, initialize with an empty transaction data set, and display zero values in the Balance_Display and Pie_Chart without throwing an unhandled error.
5. IF a Storage write operation fails (e.g., storage quota exceeded), THEN THE App SHALL display an error message indicating the data could not be saved and retain the current in-memory transaction data set without reverting the UI.
6. THE App SHALL function correctly after a browser page refresh, displaying all previously saved transactions with their correct names, amounts, categories, and dates.

---

### Requirement 6: Custom Categories

**User Story:** As a user, I want to define my own spending categories so that I can track expenses beyond the built-in options.

#### Acceptance Criteria

1. THE Transaction_Form SHALL provide an input field within the category selector area that allows the user to create a Custom_Category by entering a name of 1–50 non-whitespace-only characters not already present in the category selector.
2. WHEN a Custom_Category is created, THE App SHALL add it to the category selector and make it available for selection on future transactions.
3. WHEN a Custom_Category is created, THE App SHALL immediately persist the updated custom category list to Storage so that Custom_Category entries are available after a page refresh.
4. IF the user attempts to create a Custom_Category with a name that is empty, whitespace-only, or already exists in the category selector (case-insensitive), THEN THE App SHALL display a validation message indicating the reason and SHALL NOT add a duplicate or invalid entry.
5. WHEN the App initializes, THE App SHALL load all previously saved Custom_Category entries from Storage and populate the category selector with those entries in addition to the built-in categories.
6. THE App SHALL allow a maximum of 50 Custom_Category entries; IF the user attempts to add a Custom_Category when 50 already exist, THEN THE App SHALL display a validation message and SHALL NOT add the entry.
7. THE Pie_Chart SHALL display Custom_Category entries as separate slices, each with a unique color distinguishable from all other slices and built-in category slices.

---

### Requirement 7: Monthly Summary

**User Story:** As a user, I want to view a summary of my spending for a specific month so that I can review expenses on a monthly basis.

#### Acceptance Criteria

1. THE App SHALL provide a month selector control that defaults to the current calendar month on page load and allows the user to select any month from the month of the earliest recorded transaction up to the current month.
2. WHEN the user selects a month, THE App SHALL display a Monthly_Summary showing only transactions whose recorded date falls within the selected calendar month and year.
3. THE Monthly_Summary SHALL include the total spending for the selected month formatted as "Rp X" with dot-separated thousands (e.g., Rp 1.250.000).
4. THE Monthly_Summary SHALL include a filtered Transaction_List showing only transactions for the selected month.
5. WHEN a transaction is added, THE App SHALL record the device's local calendar date on the transaction so that Monthly_Summary filtering is accurate.
6. WHEN the user clears the month selector selection, THE App SHALL display all transactions across all months.
7. WHEN no transactions exist for the selected month, THE Monthly_Summary SHALL display a message indicating no spending was recorded for that month.

---

### Requirement 8: Spending Limit Warning

**User Story:** As a user, I want to set a spending limit so that I receive a warning when my total spending is approaching or has exceeded my budget.

#### Acceptance Criteria

1. THE App SHALL provide an input control that allows the user to set a Spending_Limit as a non-negative number in the range of 0.01 to 999,999,999.99, with a maximum of 2 decimal places.
2. WHEN the user sets a Spending_Limit, THE App SHALL persist the value to Storage within 500 milliseconds.
3. WHEN the App initializes, THE App SHALL load the previously saved Spending_Limit from Storage, if one exists.
4. IF loading the Spending_Limit from Storage fails, THEN THE App SHALL initialize with no Spending_Limit set and hide all spending limit warning indicators.
5. WHILE the total spending is greater than or equal to 90% of the Spending_Limit and less than or equal to 100% of the Spending_Limit, THE App SHALL display a near-limit warning indicator.
6. WHILE the total spending exceeds the Spending_Limit, THE App SHALL display an exceeded-budget indicator that is visually distinct from the near-limit warning indicator.
7. WHEN a transaction is added or deleted and the Spending_Limit is set, THE App SHALL evaluate the warning conditions and update the displayed warning indicator within 500 milliseconds.
8. WHEN the Spending_Limit input is cleared or set to zero, THE App SHALL hide all spending limit warning indicators within 500 milliseconds.

---

### Requirement 9: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light themes so that I can use the app comfortably in different lighting environments.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control that switches the Theme between light mode and dark mode.
2. WHEN the user activates the toggle, THE App SHALL apply the selected Theme to all visible UI components within 100 milliseconds without a page reload.
3. WHEN the user changes the Theme, THE App SHALL persist the selected Theme preference to the browser's localStorage.
4. WHEN the App initializes, THE App SHALL read the Theme preference from localStorage and apply it before the first paint so that no UI elements are rendered in the wrong theme.
5. IF no Theme preference is saved in localStorage, THEN THE App SHALL default to the user's operating system color scheme preference where the browser supports it, and SHALL fall back to light mode otherwise.
6. THE dark mode Theme SHALL provide a color contrast ratio of at least 4.5:1 between text and its background for normal-sized text, and at least 3:1 for large text and interactive controls, across all UI components.

---

### Requirement 10: Responsiveness and Cross-Browser Compatibility

**User Story:** As a user, I want the app to work correctly on my phone, tablet, and desktop across major browsers so that I can use it on any device.

#### Acceptance Criteria

1. THE App SHALL render without horizontal scrolling on viewport widths from 320px to 1440px and above.
2. THE App SHALL be functional on the latest stable versions of Chrome, Firefox, Edge, and Safari, with no content overlapping, clipping, or missing, and with all interactive controls (buttons, inputs, chart) remaining operable.
3. THE App SHALL support touch interaction on mobile and tablet devices such that all interactive controls are operable via touch gestures equivalent to their mouse-based interactions.
4. THE App SHALL NOT depend on any backend server, build tool, or runtime environment beyond a modern web browser.
5. THE App SHALL load Chart.js from a CDN reference in index.html and SHALL NOT require a local copy of Chart.js.
