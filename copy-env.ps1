# Script sao chep tu dong cac file .env.example sang .env
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$pairs = @(
    @{ Src = "web/.env.example"; Dst = "web/.env" },
    @{ Src = "web/backend/.env.example"; Dst = "web/backend/.env" },
    @{ Src = "web/web-admin/.env.example"; Dst = "web/web-admin/.env" },
    @{ Src = "web/web-shop/.env.example"; Dst = "web/web-shop/.env" }
)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Dang tao cac file .env tu .env.example..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

foreach ($pair in $pairs) {
    $srcPath = Join-Path $PSScriptRoot $pair.Src
    $dstPath = Join-Path $PSScriptRoot $pair.Dst
    
    if (Test-Path -LiteralPath $srcPath) {
        Copy-Item -LiteralPath $srcPath -Destination $dstPath -Force
        Write-Host " [OK] Da sao chep: $($pair.Src) -> $($pair.Dst)" -ForegroundColor Green
    } else {
        Write-Host " [WARN] Khong tim thay file: $($pair.Src)" -ForegroundColor Yellow
    }
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " Hoan tat tao cac file .env!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
