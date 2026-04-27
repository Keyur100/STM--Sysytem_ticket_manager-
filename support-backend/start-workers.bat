@echo off
REM PM2 Workers Batch Script
REM Usage: start-workers.bat [command]
REM Commands: start, stop, restart, status, logs, clean, help

setlocal enabledelayedexpansion

set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=help

if /i "%COMMAND%"=="start" goto START_WORKERS
if /i "%COMMAND%"=="stop" goto STOP_WORKERS
if /i "%COMMAND%"=="restart" goto RESTART_WORKERS
if /i "%COMMAND%"=="status" goto STATUS
if /i "%COMMAND%"=="logs" goto LOGS
if /i "%COMMAND%"=="clean" goto CLEAN
if /i "%COMMAND%"=="help" goto HELP
if /i "%COMMAND%"=="monit" goto MONIT

echo Unknown command: %COMMAND%
goto HELP

:START_WORKERS
echo.
echo ========================================
echo Starting All SAAS Workers...
echo ========================================
echo.
cd support-backend
pm2 start pm2.worker.config.js
pm2 list
cd ..
echo.
echo ✓ All workers started!
echo.
pause
goto END

:STOP_WORKERS
echo.
echo ========================================
echo Stopping All Workers...
echo ========================================
echo.
pm2 stop all
echo.
echo ✓ All workers stopped!
echo.
pause
goto END

:RESTART_WORKERS
echo.
echo ========================================
echo Restarting All Workers...
echo ========================================
echo.
pm2 restart all
pm2 list
echo.
echo ✓ All workers restarted!
echo.
pause
goto END

:STATUS
echo.
echo ========================================
echo Worker Status
echo ========================================
echo.
pm2 list
echo.
pause
goto END

:LOGS
echo.
echo ========================================
echo Viewing Logs (Press Ctrl+C to exit)
echo ========================================
echo.
pm2 logs
goto END

:CLEAN
echo.
echo ========================================
echo Cleaning Up (Deleting All Workers)
echo ========================================
echo.
set /p CONFIRM="Are you sure? (yes/no): "
if /i "%CONFIRM%"=="yes" (
    pm2 delete all
    pm2 flush
    echo ✓ All workers deleted and logs flushed!
) else (
    echo Cancelled.
)
echo.
pause
goto END

:MONIT
echo.
echo ========================================
echo Real-time Monitoring (Press Ctrl+C to exit)
echo ========================================
echo.
pm2 monit
goto END

:HELP
echo.
echo ========================================
echo SAAS Workers PM2 Management
echo ========================================
echo.
echo COMMANDS:
echo.
echo   start              - Start all workers
echo   stop               - Stop all workers
echo   restart            - Restart all workers
echo   status             - Show worker status
echo   logs               - View logs ^(Ctrl+C to exit^)
echo   monit              - Real-time monitoring ^(Ctrl+C to exit^)
echo   clean              - Delete all workers
echo   help               - Show this help
echo.
echo EXAMPLES:
echo.
echo   start-workers.bat start
echo   start-workers.bat status
echo   start-workers.bat logs
echo.
echo AVAILABLE WORKERS:
echo.
echo   • saas-subscription-expiry-worker
echo   • saas-subscription-grace-reactivation-worker
echo   • saas-subscription-reminder-worker
echo   • saas-addon-expiry-worker
echo   • saas-pending-addon-applier-worker
echo   • saas-trial-expiry-worker
echo   • saas-billing-worker
echo   • saas-payment-reconciliation-worker
echo   • saas-proration-worker
echo   • saas-usage-quota-enforcement-worker
echo   • saas-wallet-deduction-worker
echo   • saas-notification-worker
echo   • saas-hard-delete-worker
echo   • saas-health-worker
echo.
pause
goto END

:END
endlocal
exit /b 0
