# SmartKharkov - Auto Repair Shop Management System

Comprehensive system for managing an auto repair shop in Ukraine.

---

## WINDOWS 10 - Quick Start

### Step 1 - Install Node.js (ONE TIME ONLY)

1. Go to: **https://nodejs.org/**
2. Click **"LTS"** download button (e.g. 20.x or 22.x)
3. Run the installer, click "Next" on all steps
4. **IMPORTANT:** After install, **RESTART** your computer or open a new Command Prompt

### Step 2 - Build the project (ONE TIME ONLY)

Double-click: **`SmartKharkov_Build.bat`**

- It will install all packages automatically
- Then build the project into `dist\index.html`
- Takes **2-5 minutes** on first run
- Will automatically open the app in your browser

### Step 3 - Run every day

After the first build, just double-click: **`ZAPUSTITI.bat`**

Or manually open: `dist\index.html` in Chrome or Edge

---

## Troubleshooting

### Error: "'node' is not recognized as an internal or external command"

**Cause:** Node.js is not installed or PATH is not updated.

**Fix:**
1. Download Node.js from https://nodejs.org/ (LTS version)
2. Install it (keep all default options checked)
3. **RESTART your computer** (not just the terminal!)
4. Double-click `SmartKharkov_Build.bat` again

### Error: "npm install failed" or build errors

**Fix:** Try running `SmartKharkov_Build.bat` as Administrator:
- Right-click on `SmartKharkov_Build.bat`
- Select "Run as administrator"

### PowerShell script blocked

**Fix:** Open PowerShell as Administrator and run:
```
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Browser opens blank page

- Make sure you use **Chrome** or **Edge** (NOT Internet Explorer!)
- Try dragging `dist\index.html` directly into the browser window

### Antivirus blocks .bat file

- Add the project folder to antivirus exceptions
- Or just open `dist\index.html` directly in your browser

---

## Launcher Files

| File | Purpose |
|------|---------|
| `ZAPUSTITI.bat` | **Simplest** - just opens the app (after first build) |
| `SmartKharkov.bat` | Opens app or builds if needed |
| `SmartKharkov_Build.bat` | Full build with detailed output |
| `SmartKharkov_Launch.ps1` | PowerShell launcher (right-click -> Run with PowerShell) |
| `CreateShortcut.bat` | Creates a Desktop shortcut |

---

## Features

### Dashboard
- Active orders, revenue, critical stock alerts
- Notifications panel

### Work Orders (Narad-Zamovlennia)
- Create orders linked to clients and cars
- Add services with assigned master and hours
- Add parts from warehouse (auto-deducts stock)
- Status: New → In Progress → Pending Parts → Completed
- Payment: Cash / Card / Bank Transfer
- Print Act of Completed Works

### Diagnostics
- Full vehicle inspection card (Engine, Brakes, Suspension, Fluids, Electrical, Tires, Body, Exhaust)
- Status: OK / Warning / Critical
- Select responsible master from dropdown
- Print diagnostic act

### Clients
- Full client database with car info (VIN, plate number)
- Search by name, phone, plate
- Add/edit/delete

### Warehouse (Sklad)
- Parts inventory with SKU, category, prices
- Manage categories and suppliers
- Low stock alerts
- Margin calculation

### Parts Ordering (Zamovlennia Zapchastyn)
- Search in: Omega, Inter Cars, ELIT, Autotechnics, Autodoc, Exist
- Add to cart and compare prices
- Auto-add to warehouse stock after ordering
- Enter dealer API keys in "Supplier Accounts" tab

### Salary (Zarplata)
- Select any date range (e.g., 1st to 5th, Mon to Fri)
- Daily breakdown with base pay + bonus from services
- Export to PDF

### Reports (Zvity)
- Financial report (revenue, expenses, profit)
- Warehouse report (stock value, margins)
- Work report (by master, by car make, by client)
- Filters: period, payment type, master, status, car make
- Export CSV / Print

### Expenses (Vytraty)
- Track operational expenses (rent, utilities, tools, etc.)
- Category breakdown

### RRO / PRRO (Fiscal Register)
- Support: Checkbox, Vchasno Kasa, Taxer, DPS Kasa
- Fiscalize orders with one click
- X-report (interim) and Z-report (close shift)
- Manual receipt creation
- Print fiscal receipts with QR code

### Telegram Bot
- Real API integration
- Notifications: new orders, completions, low stock, payments, new clients
- Test connection button

### Database
- Vehicle makes and models database
- Parts catalog with OEM codes and compatibility
- Work norms (hours and prices)
- Client analytics
- Document templates
- Suppliers management

### Users & Permissions
- Roles: Administrator, Manager, Master
- Custom permissions per user
- Add/edit/delete users

### Company Settings
- Name, address, phone, email, EDRPOU, IBAN
- Auto-fills in all printed documents

---

## Data Storage

All data is stored in browser localStorage:

| Key | Data |
|-----|------|
| `smartkharkov_data` | Clients, orders, inventory, employees |
| `smartkharkov_db_extras` | Vehicle DB, catalog, work norms |
| `smartkharkov_supplier_accounts` | Supplier accounts |
| `smartkharkov_supplier_cart` | Shopping cart |
| `smartkharkov_rro` | RRO settings |
| `smartkharkov_fiscal_receipts` | Fiscal receipts |

> **Warning:** Clearing browser data (cache clear) will delete all data!
> Regularly export reports as CSV for backup.

---

## For Developers

```bash
# Install dependencies
npm install

# Development mode (hot reload)
npm run dev
# Open http://localhost:5173

# Build for production (single standalone HTML file)
npm run build
# Result: dist/index.html (~935 KB, no server needed)
```

---

## Contact

Website: https://www.smart-kharkov.com/
