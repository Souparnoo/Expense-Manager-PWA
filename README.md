# Expense Manager

A privacy-first, fully offline Progressive Web App for tracking personal expenses, splitting costs with friends, and — as of version 3.0 — confirming shared payments in real time between two independent users.

No backend server. No account required to use the core app. Your data lives on your device unless you explicitly choose to back it up.

---

## Table of Contents

1. [For Users — What This App Does](#for-users--what-this-app-does)
2. [For Developers — How It's Built](#for-developers--how-its-built)
3. [Version History](#version-history)

---

## For Users — What This App Does

### Core Expense Tracking

Record what you spend, when, and on whom — in two taps or less.

- **Quick Add** — one-tap buttons for expenses you log often (Tea, Lunch, Bus fare). Each one remembers its own category.
- **Manual Entry** — type a name and amount for anything else.
- **Date, Time, Paid By, Paid For** — every expense is tagged with who actually paid and who it was for. The app enforces sensible rules automatically:
  - If a friend paid, the expense is assumed to be *for you* — you don't have to set it manually.
  - If you paid, you choose whether it was for yourself or a friend.
  - Friend-to-friend payments where you're not involved are not tracked — this app is about *your* money.

### Categories

Every expense belongs to a category — Food, Transport, Shopping, Rent, Medical, Education, Entertainment, Bills, or Other by default. You can:
- Create your own categories with a custom name, emoji icon, and color
- Edit or delete any category, including the defaults
- Tap a category on the Categories page to see total spent, transaction count, and full history for just that category

### Friends & Settlements

Add friends to track shared expenses without needing them to do anything on their end.

- **Settle Up** page shows, for each friend, whether you owe them or they owe you — calculated automatically from every expense where money crossed between you.
- Record a settlement (cash, UPI, bank transfer — doesn't matter how) and the balance updates immediately.
- Deactivate a friend you no longer split costs with — their history stays intact, they just disappear from new-expense pickers.

### History & Search

- **Personal History** — every expense you've ever logged, grouped by date, with search, date-range filtering, category filtering, and four sort orders.
- **Friend History** — the same view, but focused on transactions involving friends, with per-day running totals of who owes whom.

### Analytics

Visual breakdowns of where your money goes:
- Monthly spending trend (last 6 months)
- Daily spending for the current month
- Category breakdown — pie chart plus a monthly bar comparison
- Top 5 spending categories
- Friend settlement summary at a glance

### Backup & Export

Your data never leaves your device unless you say so.

- **Local JSON Backup** — export everything to a file you control, import it back anytime.
- **Excel Export** — a full `.xlsx` workbook: all-history sheet, your-personal-expenses sheet, and one sheet per friend with running balances.
- **Google Drive Backup** *(optional)* — sign in once, and your encrypted-or-plain backup syncs to your own Drive's private app folder. Nobody can see it unless you choose unencrypted mode and share access yourself. AES-256-GCM encryption is available if you want a password-protected backup.

### NEW in 3.0 — Real-Time Collaborative Confirmation

This is the headline feature of this release, and it works like this:

1. **Link a friend's Gmail.** When adding or editing a friend, optionally attach their Google account email.
2. **Pay normally.** Record an expense as usual — "I paid ₹200 for Ranit's lunch."
3. **They get notified.** If Ranit has also opened the app and signed in with that same Gmail, he receives a live notification: *"Souparna paid ₹200 for Lunch — Accept or Reject?"*
4. **He responds.** One tap. If he accepts, the expense is automatically added to *his* app too, correctly attributed. If he rejects, nothing is added on his side — and you immediately see a ❌ on your end.
5. **You see the result instantly.** No refreshing, no guessing. Your Inbox has a "Sent" tab showing every payment you've sent out and its live status: waiting, accepted, or rejected.

This works in both directions — if a friend records that *they* paid for *you*, you get the same kind of notification to confirm or deny it on your end.

**Everything about this feature is optional.** If you never link a Gmail and never sign into the collaborative inbox, the app behaves exactly as it did in version 2.x — fully local, fully offline, zero network calls.

### Installing as an App

This is a real installable app, not just a website:

| Platform | How |
|---|---|
| Android | Chrome → menu → "Add to Home Screen" |
| iPhone/iPad | Safari → Share → "Add to Home Screen" |
| Windows/macOS/Linux | Chrome or Edge → address bar install icon |

Once installed it opens full-screen, has its own icon, and works without internet for everything except the optional Drive backup and collaborative inbox.

---

## For Developers — How It's Built

### Architecture Philosophy

The app is built around a simple rule: **local-first, network-optional**. Every feature must work fully offline using IndexedDB as the source of truth. Network features (Drive backup, Firebase notifications) are additive layers that degrade gracefully to no-ops if not configured.

### Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 + TypeScript, Vite build tooling |
| Component Library | Material UI v5 |
| Local Database | IndexedDB via the `idb` wrapper library |
| Charts | Recharts |
| Spreadsheet Export | SheetJS (`xlsx`) |
| Encryption | Web Crypto API — AES-256-GCM with PBKDF2 key derivation |
| Cloud Backup | Google Drive API (OAuth via Google Identity Services) |
| Real-Time Sync | Firebase Authentication + Realtime Database |
| PWA / Offline | Vite PWA plugin, Workbox service worker |

### Project Structure

```
src/
├── components/
│   ├── common/        — ConfirmDialog, EmptyState, PageHeader, NotificationBadge
│   ├── dashboard/      — DashboardStats, RecentTransactions
│   ├── expenses/       — TransactionSelectors, CategorySelector, QuickExpenseButtons, ManualExpenseForm
│   └── settings/       — DriveBackupCard
├── db/
│   └── index.ts        — IndexedDB schema, all CRUD operations, export/import
├── hooks/
│   ├── useApp.tsx       — global app state (expenses, friends, categories, settings)
│   └── useFirebaseAuth.tsx — collaborative notification state, Firebase auth
├── pages/               — one file per top-level screen
├── types/
│   └── index.ts         — every TypeScript interface used across the app
└── utils/
    ├── index.ts          — formatting, date math, balance calculations
    ├── theme.ts           — MUI theme (dark/light, brand colors)
    ├── excel.ts            — XLSX generation
    ├── crypto.ts            — AES-256-GCM encrypt/decrypt for backups
    ├── gdrive.ts             — Google Drive OAuth + file upload/download
    ├── firebase.ts            — Firebase init, auth, Realtime Database operations
    └── notifications.ts        — payment notification send logic
```

### Local Data Model (IndexedDB)

Six object stores, all keyed by a generated string ID:

- `friends` — name, optional linked Gmail, active flag
- `categories` — name, icon, color
- `quickExpenses` — name, amount, default category
- `expenses` — the core record: date, time, amount, paidBy, paidFor, category, confirmation status
- `settlements` — manual balance adjustments between you and a friend
- `settings` — single-row app preferences (dark mode, Drive connection state)

Every write goes through `db/index.ts` — no component touches IndexedDB directly, which keeps the schema centralized and migrations (the store has been through 3 schema versions) manageable.

### The Collaborative Notification System (v3.0 architecture)

This was the hardest part to get right, and the design is worth documenting since it's not obvious from the UI.

**The core problem:** two users' browsers have completely separate IndexedDBs. Firebase Realtime Database is the only shared state between them, and Firebase security rules mean a user can only read paths they own.

**The model:**

```
/notifications/{recipientUid}/{notificationId}
    The recipient's copy. Only the recipient can read it.
    The sender can write here (to deliver it) but can never read it back.

/sentNotifications/{senderUid}/{notificationId}
    The sender's own full copy of the same notification, including a live
    status field. The sender only ever reads their own node.

/users/{uid}
    Public profile (email, display name, photo) — lets senders find a
    recipient's UID.

/emailIndex/{email-with-dots-as-commas}
    Reverse lookup: email → UID, for O(1) friend resolution without
    scanning every user.
```

When a payment is sent, both the recipient's copy and the sender's mirror copy are written in a single atomic multi-path update. When the recipient accepts or rejects, the status is written into **both** copies in the same atomic update — critically, directly into the sender's own node, which the sender always has permission to read. This sidesteps the Firebase rule that would otherwise silently block the sender from ever seeing the recipient's response.

Both "Received" and "Sent" tabs in the Inbox are powered by a single direct `onValue` listener each — no nested reads, no polling, no race conditions.

### Build & Run

```bash
npm install
npm run dev       # local development server
npm run build      # production build
npm run preview     # preview the production build locally
```

### Environment Variables

Two optional integrations, both off by default:

```env
# Google Drive backup
VITE_GOOGLE_CLIENT_ID=

# Firebase (collaborative notifications)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

If unset, the relevant UI sections simply hide themselves or show a configuration prompt — the rest of the app is unaffected.

Firebase Realtime Database security rules are provided in `firebase-rules.json` at the project root and must be published in the Firebase Console for the collaborative feature to work.

---

## Version History

### 3.0.0 — Real-Time Collaborative Confirmation
The headline feature: link a friend's Gmail, send them a payment, and get a live Accept/Reject response synced through Firebase. New Inbox page with Received and Sent tabs. Confirmation status badges (⏳ pending, ✅ accepted, ❌ rejected) now appear on expenses throughout the app. Notifications can be deleted from either side without affecting the underlying expense record.

### 2.3.0 — Multi-Account Backup Reliability
Fixed the Google Drive backup session to persist properly across app restarts using silent re-authentication. Fixed a settlement balance calculation bug where accepted settlements were being double-counted.

### 2.2.0 — Visual Identity
Custom app icon across all platforms (Android, iOS, Windows, macOS). New warm orange/green/gold theme replacing the original blue palette. Fixed dark-mode text contrast in analytics chart tooltips.

### 2.1.0 — Category Refinements
Default categories can now be deleted (previously protected). Quick Add buttons moved above the category selector on the home screen for a more natural top-to-bottom flow. Excel exports now include a Category column on every sheet.

### 2.0.0 — Categories, Cloud Backup & Encryption
Introduced custom expense categories with icon and color customization, category-based analytics, optional Google Drive backup, and AES-256-GCM password-protected encrypted backups.

### 1.0.0 — Initial Release
Core expense tracking, friend management, settlement calculations, personal and friend history with search/filter/sort, basic analytics, local JSON backup, and Excel export. Fully offline PWA installable on all major platforms.

---

*Built with React, TypeScript, and a strong opinion that your financial data should belong to you.*