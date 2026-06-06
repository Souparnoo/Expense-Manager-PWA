# Expense Manager PWA

A privacy-first, offline-capable expense and friend-settlement tracker built with React, TypeScript, IndexedDB, and Material UI.

🌐 Live Demo: https://souparnoo.github.io/Expense-Manager-PWA/

---

## Overview

Expense Manager PWA is a Progressive Web Application (PWA) designed to help users track personal expenses, manage shared expenses with friends, monitor budgets, and analyze spending habits.

Unlike traditional expense trackers, all data is stored locally on the user's device using IndexedDB. No account, internet connection, or cloud storage is required.

The application can be installed on Android, Windows, Linux, and macOS directly from the browser.

---

## Key Features

### Personal Expense Tracking

Track daily expenses with:

* Expense name
* Amount
* Date
* Time

Examples:

* Tea
* Lunch
* Transport
* Shopping
* Bills

Expenses can be recorded instantly and are permanently stored locally.

---

### Quick Expense Buttons

Frequently used expenses can be saved as reusable quick actions.

Examples:

* Tea ₹10
* Breakfast ₹40
* Bus ₹20

One click instantly records the expense using the currently selected date, time, and payment information.

Benefits:

* Faster entry
* Reduced repetitive typing
* Better daily usability

---

### Manual Date and Time Selection

Expenses are not restricted to the current date.

Users can:

* Select any date
* Select any time
* Add expenses retroactively

This is useful when an expense was forgotten and needs to be added later.

All history and analytics update automatically after insertion.

---

### Friend Settlement System

The application supports shared expenses between the user and friends.

Supported transaction types:

1. Me → Me
2. Me → Friend
3. Friend → Me

The application automatically prevents Friend → Friend transactions because they do not involve the user.

---

### Smart Balance Calculation

When the user pays for a friend:

Example:

Lunch ₹200

Paid By: Me

Paid For: Rahul

Result:

Rahul owes me ₹200

---

When a friend pays for the user:

Example:

Tea ₹50

Paid By: Rahul

Paid For: Me

Result:

I owe Rahul ₹50

Balances are calculated automatically.

---

### Settlement Tracking

Record settlement payments between friends.

Example:

Rahul pays back ₹500.

The application automatically updates balances while preserving the full transaction history.

---

### Friend Management

Manage a list of frequently used friends.

Features:

* Add Friend
* Edit Friend
* Deactivate Friend
* Delete Friend

Historical records remain intact even when friends are removed from active use.

---

### Daily and Monthly Expense Dashboard

View:

* Today's Expense
* Monthly Expense
* Today's Transaction Count
* Monthly Transaction Count

The dashboard focuses on expenses incurred on the user.

Friend-only expenses are excluded from personal expense calculations.

---

### Monthly Budget Planning

Set a monthly budget.

Example:

Budget: ₹5000

The application displays:

* Total Spent
* Remaining Budget
* Budget Progress

Helping users monitor spending habits throughout the month.

---

### Permanent Expense History

All records are permanently stored.

Features:

* No automatic deletion
* Historical records preserved
* Date-wise organization

Users can browse previous days and review detailed expense logs.

---

### Personal History Page

Browse expenses grouped by date.

For each date:

* Daily total expense
* Detailed transaction list

Detailed view includes:

* Time
* Expense Name
* Amount
* Paid By
* Paid For

Additional features:

* Search
* Date filtering
* Sorting

---

### Friend History Page

Friend transactions are also stored permanently.

Users can:

* View date-wise summaries
* Open detailed daily records
* Search transactions
* Filter by date range

---

### Expense Editing

Modify previously recorded data.

Supported:

* Edit Expense
* Edit Friend Transaction
* Edit Quick Expense
* Edit Friend Information

All totals and analytics update automatically.

---

### Safe Deletion

Users may delete:

* Expenses
* Friend Transactions
* Quick Expenses

Deletion confirmation dialogs help prevent accidental data loss.

Historical integrity is preserved.

---

### Excel Export

Generate a structured Excel workbook containing all financial data.

Included sheets:

#### ALL_HISTORY

Contains every transaction recorded in the application.

Columns:

* Date
* Time
* Expense Name
* Amount
* Paid By
* Paid For

---

#### MY_EXPENSES

Contains only expenses incurred on the user.

Includes:

* Personal expenses
* Friend-paid expenses

Excludes:

* Expenses paid on behalf of friends

---

#### Friend Sheets

A dedicated sheet is created for every friend.

Example:

* Rahul
* Amit
* Sourav

Each sheet contains:

* Date
* Time
* Expense
* Transaction Type
* Paid By
* Amount

Along with settlement summaries and net balances.

---

### Analytics Dashboard

Interactive charts provide spending insights.

Includes:

* Monthly Spending Trend
* Expense Category Breakdown
* Friend Settlement Overview

Helping users better understand spending behavior.

---

### Offline First Design

The application works entirely offline.

Benefits:

* No internet required
* Faster performance
* Better privacy
* No external servers

All information remains on the user's device.

---

### Backup and Restore

Protect your data using:

* Export Backup
* Import Backup

Data can be transferred between devices or restored after reinstalling the application.

---

## Technology Stack

Frontend:

* React
* TypeScript
* Vite
* Material UI

Storage:

* IndexedDB

Data Export:

* XLSX

Visualization:

* Recharts

Deployment:

* GitHub Pages

---

## Progressive Web App Features

The application can be installed directly from the browser.

Supported Platforms:

* Android
* Windows
* Linux
* macOS

Features:

* Offline access
* Home screen installation
* App-like experience
* Fast loading

---

## Why This Project?

Many expense trackers require:

* Accounts
* Internet connectivity
* Cloud synchronization
* Subscription plans

Expense Manager PWA was built with a different philosophy:

**Your financial data should remain on your device, under your control, and accessible even without an internet connection.**

---

## Author

Souparna Kundu

Electronics and Communication Engineering (ETCE)

Jadavpur University

GitHub: https://github.com/Souparnoo
