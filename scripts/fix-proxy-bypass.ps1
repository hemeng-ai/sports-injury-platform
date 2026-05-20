# fix-proxy-bypass.ps1
# 确保 Windows 代理绕行列表包含 IPv6 localhost (::1) 和 <local> 令牌
# 解决 Clash/代理软件开启后本地开发站点无法访问的问题
#
# 根因：Windows 代理绕行列表缺少 ::1 (IPv6 localhost)
# 当浏览器用 IPv6 解析 localhost 时，流量被代理拦截，无法到达本地 server
#
# 使用方法：powershell -ExecutionPolicy Bypass -File scripts/fix-proxy-bypass.ps1

$registryPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings"
$current = Get-ItemProperty -Path $registryPath -Name ProxyOverride -ErrorAction SilentlyContinue

if (-not $current) {
    Write-Host "[INFO] No system proxy detected, nothing to fix"
    exit 0
}

$currentValue = $current.ProxyOverride
$entries = $currentValue -split ';' | Where-Object { $_ -ne '' }

$hasIPv6 = $entries -contains '::1'
$hasLocalToken = $entries -contains '<local>'

if ($hasIPv6 -and $hasLocalToken) {
    Write-Host "[OK] Proxy bypass already includes ::1 and <local>"
    exit 0
}

$append = @()
if (-not $hasIPv6) { $append += "::1" }
if (-not $hasLocalToken) { $append += "<local>" }

$entries += $append
$newValue = ($entries | Select-Object -Unique) -join ';'
Set-ItemProperty -Path $registryPath -Name ProxyOverride -Value $newValue

Write-Host "[FIXED] Proxy bypass updated"
if (-not $hasIPv6) { Write-Host "  + ::1 (IPv6 localhost bypass)" }
if (-not $hasLocalToken) { Write-Host "  + <local> (all local hostnames bypass)" }
