@echo off
cd /d "C:\Users\jwwel\Documents\code\mcp-shrimp-task-manager-enhanced"
echo Building MCP Shrimp Task Manager...
npm run build
if %ERRORLEVEL% equ 0 (
    echo Build completed successfully!
) else (
    echo Build failed with error code %ERRORLEVEL%
)
pause
