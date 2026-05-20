# fix-proxy-bypass.ps1
# Add campus network IPs and localhost to Windows proxy bypass list
# Solves: Clash/proxy intercepting campus LAN traffic so deployed projects are unreachable
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/fix-proxy-bypass.ps1 -CampusIPs @("10.147.227.36")

param(
    [string[]]$CampusIPs = @()
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Proxy Bypass Fix Tool" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check for running proxy processes
$clashProcs = Get-Process -Name "clash*", "mihomo*", "Clash*", "Mihomo*" -ErrorAction SilentlyContinue
if ($clashProcs) {
    Write-Host "[INFO] Clash/Mihomo is running" -ForegroundColor Yellow
} else {
    Write-Host "[INFO] No Clash/Mihomo process detected (ignore if using other proxy)" -ForegroundColor Gray
}
Write-Host ""

# 2. Fix system proxy bypass list
$regPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
$current = Get-ItemProperty -Path $regPath -Name ProxyOverride -ErrorAction SilentlyContinue

if ($current -and $current.ProxyOverride) {
    $entries = $current.ProxyOverride -split ';' | Where-Object { $_ -ne '' }
    Write-Host "[CURRENT] ProxyOverride: $($current.ProxyOverride)" -ForegroundColor Gray
} else {
    $entries = @()
    Write-Host "[INFO] No system proxy configured, skipping registry modification" -ForegroundColor Gray
}

$appendList = @()

# Always need these
if ($entries -notcontains '::1') { $appendList += '::1' }
if ($entries -notcontains '<local>') { $appendList += '<local>' }

# Campus IPs
foreach ($ip in $CampusIPs) {
    if ($entries -notcontains $ip) {
        $appendList += $ip
    }
}

if ($appendList.Count -gt 0 -and $current) {
    $entries += $appendList
    $newValue = ($entries | Select-Object -Unique) -join ';'
    Set-ItemProperty -Path $regPath -Name ProxyOverride -Value $newValue

    Write-Host ""
    Write-Host "[SYSTEM PROXY] Added bypass entries:" -ForegroundColor Green
    foreach ($item in $appendList) {
        Write-Host "  + $item" -ForegroundColor Green
    }
    Write-Host "[SYSTEM PROXY] Updated ProxyOverride: $newValue" -ForegroundColor Gray
} elseif (-not $current) {
    Write-Host "[SYSTEM PROXY] Skipped - no system proxy active" -ForegroundColor Gray
} else {
    Write-Host "[SYSTEM PROXY] All required entries already present" -ForegroundColor Green
}

# 3. TUN mode guidance
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  TUN Mode Troubleshooting" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "If Clash is using TUN mode, system proxy bypass does NOT work." -ForegroundColor Yellow
Write-Host "You must add bypass rules to the Clash config file directly."
Write-Host ""
Write-Host "Clash config is usually at: `$env:USERPROFILE\.config\clash\config.yaml" -ForegroundColor White
Write-Host "                               or your Clash dashboard -> Settings" -ForegroundColor White
Write-Host ""

if ($CampusIPs.Count -gt 0) {
    Write-Host "[RECOMMENDED] Add to Clash config bypass section:" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host "bypass:" -ForegroundColor White
    foreach ($ip in $CampusIPs) {
        Write-Host "  - $ip" -ForegroundColor White
    }
    Write-Host "----------------------------------------" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[NEXT STEPS]" -ForegroundColor Cyan
Write-Host "  1. Close ALL browser windows and re-open"
Write-Host "  2. If TUN mode: add bypass to Clash config, then restart Clash"
Write-Host "  3. Try accessing http://10.147.227.36:3000 (or your port)"
