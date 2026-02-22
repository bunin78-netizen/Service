# SmartKharkov - PowerShell Launcher
# Right-click -> "Run with PowerShell"

$Host.UI.RawUI.WindowTitle = "SmartKharkov"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if ([string]::IsNullOrEmpty($ScriptDir)) { $ScriptDir = Get-Location }
Set-Location $ScriptDir

Write-Host ""
Write-Host "  =============================================" -ForegroundColor Yellow
Write-Host "   SmartKharkov - Auto Repair Shop System     " -ForegroundColor Yellow
Write-Host "  =============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Folder: $ScriptDir" -ForegroundColor Gray
Write-Host ""

$DistFile = Join-Path $ScriptDir "dist\index.html"

# If built - just open
if (Test-Path $DistFile) {
    Write-Host "  [OK] Found: dist\index.html" -ForegroundColor Green
    Write-Host "  Opening SmartKharkov..." -ForegroundColor Cyan
    try {
        Start-Process $DistFile
        Write-Host "  [OK] SmartKharkov opened in browser!" -ForegroundColor Green
    } catch {
        Write-Host "  [INFO] Open manually: $DistFile" -ForegroundColor Yellow
    }
    Write-Host ""
    Read-Host "  Press Enter to exit"
    exit 0
}

# Need to build
Write-Host "  [INFO] dist\index.html not found. Building..." -ForegroundColor Yellow
Write-Host ""

# Check Node.js
Write-Host "  Checking Node.js..." -ForegroundColor Gray
try {
    $nodeVer = & node --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "not found" }
    Write-Host "  [OK] Node.js $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Node.js not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Download from: https://nodejs.org/" -ForegroundColor Cyan
    Write-Host "  Install LTS version then restart this script." -ForegroundColor Gray
    $ans = Read-Host "  Open nodejs.org? (Y/N)"
    if ($ans -match "^[Yy]") { Start-Process "https://nodejs.org/" }
    Read-Host "  Press Enter to exit"
    exit 1
}

# Check package.json
if (-not (Test-Path "package.json")) {
    Write-Host "  [ERROR] package.json not found! Wrong folder?" -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}

# Install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing dependencies (2-3 min)..." -ForegroundColor Yellow
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] npm install failed!" -ForegroundColor Red
        Read-Host "  Press Enter to exit"
        exit 1
    }
    Write-Host "  [OK] Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  [OK] node_modules found" -ForegroundColor Green
}

# Build
Write-Host ""
Write-Host "  Building SmartKharkov (30-90 sec)..." -ForegroundColor Yellow
Write-Host ""
& npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Build failed!" -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}

if (-not (Test-Path $DistFile)) {
    Write-Host "  [ERROR] dist\index.html not found after build!" -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "  =============================================" -ForegroundColor Green
Write-Host "  [SUCCESS] SmartKharkov built successfully!" -ForegroundColor Green
Write-Host "  =============================================" -ForegroundColor Green
Write-Host ""

# Open in browser
Write-Host "  Opening SmartKharkov..." -ForegroundColor Cyan
try {
    Start-Process $DistFile
    Write-Host "  [OK] SmartKharkov opened!" -ForegroundColor Green
} catch {
    Write-Host "  [INFO] Open manually: $DistFile" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Next time just double-click ZAPUSTITI.bat" -ForegroundColor Gray
Write-Host ""
Read-Host "  Press Enter to exit"
