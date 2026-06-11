# 💰 Expense Manager PWA

A fully offline-capable, installable Personal Expense Manager built as a Progressive Web App. Track daily spending, manage friend settlements, analyse your habits with charts, and back up everything to Google Drive — all without a backend, server, or account.

> **Live on:** [souparnoo.github.io/Expense-Manager-PWA](https://souparnoo.github.io/Expense-Manager-PWA/)

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Component Library | Material UI v5 (MUI) |
| Local Storage | IndexedDB via `idb` v8 |
| Charts | Recharts v2 |
| Excel Export | SheetJS (`xlsx`) |
| Date Handling | Day.js |
| PWA | `vite-plugin-pwa` + Workbox |
| Encryption | Web Crypto API (AES-256-GCM + PBKDF2) |

---

## 📲 Installing as a Native App

This is a PWA — it installs directly from the browser with no app store required.

| Platform | How to Install |
|----------|---------------|
| **Android** | Open in Chrome → three-dot menu → *Add to Home Screen* |
| **iPhone / iPad** | Open in Safari → Share button → *Add to Home Screen* |
| **Windows** | Open in Chrome/Edge → address bar install icon → *Install* |
| **macOS / Linux** | Open in Chrome → address bar install icon → *Install* |

Once installed it runs in full-screen standalone mode, works completely offline, and receives updates automatically when you're connected.

---

## ✨ Features Overview

### Core Expense Tracking
- Record expenses with **Date, Time, Paid By, Paid For** selectors
- **Quick Expense buttons** — one-tap recording for frequent items (Tea, Bus, Lunch, etc.)
- **Manual entry** with name and amount
- **Transaction rules** enforced automatically:
  - `Me → Me` : personal expense
  - `Me → Friend` : I paid for friend (friend owes me)
  - `Friend → Me` : friend paid for me (I owe friend)
  - `Friend → Friend` : blocked — not allowed

### Dashboard
- Today's total spend and transaction count
- Monthly total spend and transaction count
- **Monthly Budget** with progress bar and over-budget warnings

### Friend Settlement System
- Track who paid for whom across all transactions
- Net balance per friend (positive = I owe, negative = friend owes me)
- Record cash/UPI settlements that adjust balances in real time
- Full settlement history per friend

### History Pages
- **Personal History** — grouped by date, expandable per-day detail
- **Friend History** — date-wise friend transaction log
- Search, date range filter, and sort (newest / oldest / highest / lowest)

### Analytics
- Monthly spending trend (6-month bar chart)
- Daily spending line chart for the current month
- Category breakdown pie chart (all time)
- Monthly category breakdown with relative progress bars
- Top 5 spending categories
- Friend settlement summary (horizontal bar chart)

### Data Portability
- **JSON Backup** — export / import all data as a single `.json` file
- **Excel Export** — full `.xlsx` with separate sheets for All History, My Expenses, and one sheet per friend
- **Google Drive Backup** — manual cloud backup with optional AES-256-GCM encryption

---

## 📁 Project Structure

```
src/
├── components/
│   ├── common/          # ConfirmDialog, EmptyState, PageHeader
│   ├── dashboard/       # DashboardStats, RecentTransactions
│   ├── expenses/        # TransactionSelectors, CategorySelector,
│   │                    # QuickExpenseButtons, ManualExpenseForm
│   └── settings/        # DriveBackupCard
├── db/
│   └── index.ts         # Full IndexedDB abstraction (CRUD + backup/restore)
├── hooks/
│   └── useApp.tsx       # Global context — all state, reload functions, form state
├── pages/
│   ├── HomePage.tsx
│   ├── HistoryPage.tsx
│   ├── FriendHistoryPage.tsx
│   ├── FriendsPage.tsx
│   ├── SettlementPage.tsx
│   ├── CategoriesPage.tsx
│   ├── AnalyticsPage.tsx
│   ├── QuickExpensesPage.tsx
│   └── SettingsPage.tsx
├── types/
│   └── index.ts         # All TypeScript interfaces and models
└── utils/
    ├── index.ts         # Formatting, date helpers, balance calculations
    ├── theme.ts         # MUI theme (light + dark)
    ├── excel.ts         # XLSX export logic
    ├── crypto.ts        # AES-256-GCM encryption / decryption
    └── gdrive.ts        # Google Drive OAuth + upload / download
```

---

## 🔒 Data & Privacy

- **100% local** — all data lives in your browser's IndexedDB
- No account, no login, no server, no telemetry
- Google Drive backup stores files in your own Drive's **appDataFolder** (hidden from Drive UI, accessible only by this app)
- Encryption keys are derived on-the-fly from your password and **never stored or transmitted**

---

## 🔧 Google Drive Backup Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the **Google Drive API**
4. Configure the **OAuth consent screen** (External, add your domain)
5. Create **OAuth 2.0 Credentials** → Web application
6. Add your domain to *Authorised JavaScript origins*
   - Development: `http://localhost:5173`
   - Production: `https://yourdomain.com`
7. Copy the **Client ID** into your `.env` file as `VITE_GOOGLE_CLIENT_ID`

---

## 📋 Changelog

---

### v2.2.0 — Icon & Theme Overhaul
*Visual identity update*

#### Custom App Icon
- Replaced the generated placeholder icons with a custom wallet illustration
- The same icon is used across all PWA install surfaces: Android home screen, iOS Safari, Windows taskbar, macOS Dock, and the in-app header
- Icon files updated: `pwa-512x512.png`, `pwa-192x192.png`, `apple-touch-icon.png`, `app-icon.png`
- PWA manifest `theme_color` updated to match

#### Warm Wallet Theme
The entire colour palette was redesigned to match the icon's visual language:

| Role | Old Colour | New Colour | Inspired by |
|------|-----------|-----------|-------------|
| Primary | `#1565C0` Blue | `#F57C00` Warm Orange | Wallet body |
| Secondary | `#00BFA5` Teal | `#2E7D32` Rich Green | Bills / money |
| Warning | `#FB8C00` Amber | `#F9A825` Gold | Coins + checkmark |
| Info | — | `#0277BD` Teal-Blue | Wallet strap |
| Background (dark) | `#0A0E1A` | `#0D0F14` Near-black | Icon dark circle |

- Card borders now use a subtle amber glow in dark mode
- FAB shadow colour changed to orange
- Selected navigation items highlight in orange
- Dividers use a warm amber tint instead of cold grey

#### Analytics Tooltip Fix
- Recharts tooltip text was rendering in black regardless of dark/light mode
- Fixed by explicitly setting `contentStyle.color`, `labelStyle`, and `itemStyle` on every chart tooltip using live MUI theme values — tooltips now correctly follow dark/light mode

---

### v2.1.0 — Category Deletion & Excel Export Improvements
*Usability and data export refinements*

#### Default Category Deletion
- Previously, the 9 built-in default categories (Food, Transport, Rent, etc.) could be edited but **not deleted**
- The restriction has been removed — all categories including defaults now show a delete button
- Deletion confirmation dialog still shown before any category is removed
- Expenses that referenced a deleted category gracefully fall back to showing "Other" in all views

#### Category Order on Home Screen
- The **Category selector** chips were previously shown *above* the Quick Add buttons
- Moved to appear *below* Quick Add buttons — the logical flow is now:
  1. Set date / time / paid by / paid for
  2. Tap a quick expense (or type a manual one)
  3. Select or confirm the category
- This matches how most people think: *what did I spend* → *what category is it*

#### Excel Export — Category Column
- All exported sheets now include a **Category** column
- Added to: `ALL_HISTORY`, `MY_EXPENSES`, and every per-friend sheet
- Category name is resolved from the stored `categoryId` at export time, with fallback to "Other" if a category was deleted after the transaction was recorded
- Column position: inserted after Expense Name so the data reads naturally as `Date | Time | Name | Category | Amount`

---

### v2.0.0 — Categories, Google Drive Backup & Encryption
*Major feature release*

#### Custom Expense Categories
Every expense now carries a category. This enables filtering, analytics breakdown, and better organisation across the whole app.

**9 built-in default categories:**
| Icon | Name | Colour |
|------|------|--------|
| 🍔 | Food | Red |
| 🚌 | Transport | Blue |
| 🛍️ | Shopping | Purple |
| 🏠 | Rent | Teal |
| 💊 | Medical | Deep Orange |
| 📚 Education | Education | Amber |
| 🎬 | Entertainment | Indigo |
| 💡 | Bills | Sky Blue |
| 📦 | Other | Grey |

Users can create unlimited additional categories, each with:
- A custom **name**
- An **emoji icon** (picker with 20 presets)
- A **colour** (picker with 15 presets)

**Where categories appear:**
- **Home page** — chip buttons for selecting the active category before recording
- **Quick Expenses** — each shortcut stores its own default category; the home-page selection overrides it only when explicitly changed
- **History page** — category icon and name shown per transaction; category filter dropdown added
- **Analytics page** — category pie chart, monthly category breakdown bar, top-5 category list
- **Categories page** — dedicated tab; click any category to expand total spent, transaction count, and full transaction history

#### Google Drive Backup
Manual cloud backup with zero server involvement — all data goes directly to the user's own Google Drive.

**How it works:**
- Uses **Google Identity Services (GIS)** popup OAuth flow
- Files are stored in Drive's `appDataFolder` scope — hidden from the regular Drive UI, only accessible by this app
- Backup filename: `expense-manager-backup.json`
- Existing backup file is overwritten on each backup (no version clutter)
- One-click **Restore** downloads the file and re-imports all data

**What is backed up:** Expenses, Friends, Categories, Quick Expenses, Budgets, Settlements

**Backup status card shows:**
- Connection status
- Last backup date and time
- Backup file name and size
- Encryption status

#### AES-256-GCM Encryption (Optional)
Before uploading to Google Drive, the backup can be encrypted client-side.

**Technical details:**
- Algorithm: **AES-256-GCM** (authenticated encryption — detects tampering)
- Key derivation: **PBKDF2-SHA-256** with 310,000 iterations (NIST 2023 recommendation)
- Random 32-byte **salt** and 12-byte **IV** generated fresh for every backup
- Stored payload: `{ version, salt, iv, ciphertext }` — all hex-encoded
- The **password is never stored** anywhere — not in IndexedDB, not in Drive, not in memory after the operation completes

**Restore flow when encrypted:**
1. Download encrypted JSON from Drive
2. Detect `{ version, salt, iv, ciphertext }` structure
3. Prompt for password
4. Derive AES key from password + salt using PBKDF2
5. Decrypt with AES-256-GCM (wrong password throws `OperationError` — shown as user-friendly message)
6. Parse and restore data

> ⚠️ **Important:** Encrypted backups cannot be recovered without the correct password. There is no reset or recovery mechanism — this is by design.

---

### v1.0.0 — Initial Release
*Foundation version*

#### Expense Recording
- Date, Time, Paid By, Paid For selectors with smart locking rules
- Quick Expense buttons for one-tap recording of frequent items
- Manual expense entry form
- Transaction validation: only `Me→Me`, `Me→Friend`, `Friend→Me` allowed

#### Friend Management
- Add, edit, deactivate, and delete friends
- Deactivated friends are excluded from new transactions but preserved in history

#### Friend Settlements
- Automatic net balance calculation per friend
- Record cash settlements that adjust balances
- Full settlement history

#### Dashboard
- Today's expense and transaction count
- Monthly expense and transaction count
- Monthly budget with progress bar and overspend warning

#### History
- Personal history grouped by date (expandable)
- Friend history grouped by date
- Search, date range filter, and sort controls

#### Analytics
- 6-month spending trend bar chart
- Daily spending line chart
- Category breakdown pie chart (using expense names as proxy)
- Friend settlement horizontal bar chart

#### Data Export
- **JSON backup** — full export and import
- **Excel export** — `ALL_HISTORY`, `MY_EXPENSES`, one sheet per friend with net balance summary row

#### PWA
- Installable on Android, iOS, Windows, macOS, Linux
- Full offline support via Workbox service worker
- Automatic updates when online

---

## 🐛 Known Bug Fixes

| Version | Bug | Fix |
|---------|-----|-----|
| Post 1.0.0 | Settlement direction default was inverted — "Friend owes me" defaulted to "I paid friend" | Fixed default `settleDirection` logic: `net > 0` (I owe) → default to `i_paid_friend`; `net < 0` (friend owes) → default to `friend_paid_me` |
| Post 1.0.0 | Net balance calculation doubled settlements — `₹45` expense + `₹45` settlement showed `₹90` instead of `₹0` | Fixed formula from `rawNet - settlementTotal` to `rawNet + settlementTotal` in both `utils/index.ts` and `utils/excel.ts` |
| Post 2.0.0 | Recharts tooltip text showed black text in dark mode | Added `itemStyle` prop to all `<Tooltip>` components with `color: theme.palette.text.primary` |

---


*Built with React + TypeScript + Vite + MUI + IndexedDB. No backend. No account. Your data stays yours.*
