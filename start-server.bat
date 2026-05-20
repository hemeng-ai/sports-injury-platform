@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   运动损伤资料平台 - 生产模式启动
echo ========================================
echo.

:: 1. 获取本机 LAN IP（取第一个非 127 的 IPv4 地址）
echo [1/4] 正在获取本机 IP...
set LAN_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "127.0.0.1"') do (
    if not defined LAN_IP (
        set "LAN_IP=%%a"
    )
)
set "LAN_IP=%LAN_IP: =%"

if "%LAN_IP%"=="" (
    echo [错误] 未检测到有效的局域网 IP，请检查网络连接
    pause
    exit /b 1
)
echo 本机 IP: %LAN_IP%
echo.

:: 2. 构建（如未构建过 standalone 输出）
echo [2/4] 检查构建状态...
if not exist ".next\standalone" (
    echo 首次运行，正在构建生产版本（约 1-2 分钟）...
    call npm run build
    if errorlevel 1 (
        echo [错误] 构建失败，请检查上方错误信息
        pause
        exit /b 1
    )
) else (
    echo 已构建，跳过
)

:: 3. 防火墙放行
echo.
echo [3/4] 配置防火墙...
netsh advfirewall firewall add rule name="运动损伤平台-3000" dir=in action=allow protocol=tcp localport=3000 2>nul
if errorlevel 1 (
    echo 防火墙规则已存在或添加失败（如已存在可忽略）
)

:: 4. 启动 PM2
echo.
echo [4/4] 启动服务...

:: 先停掉旧进程（如果有）
pm2 delete sports-injury-platform 2>nul

:: 设置环境变量并启动
set AUTH_URL=http://%LAN_IP%:3000
set NEXTAUTH_URL=http://%LAN_IP%:3000
call pm2 start ecosystem.config.js
call pm2 save

echo.
echo ========================================
echo   服务已启动！
echo.
echo   本机访问: http://localhost:3000
echo   局域网访问: http://%LAN_IP%:3000
echo.
echo   管理命令:
echo     pm2 status         查看状态
echo     pm2 logs           查看日志
echo     pm2 restart all    重启服务
echo     pm2 stop all       停止服务
echo ========================================
echo.
pause
