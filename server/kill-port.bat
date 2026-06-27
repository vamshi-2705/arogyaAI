@echo off
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000 "') do (
  echo Killing PID %%a on port 5000
  taskkill /F /PID %%a
)
echo Done.
