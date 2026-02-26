@echo off
REM Dev launcher for Windows: starts backend and frontend in new terminal windows
START "Backend" cmd /k "cd backend && ..\neossis_env\Scripts\activate.bat && uvicorn main:app --reload --port 8000"
START "Frontend" cmd /k "cd frontend && npm run dev"
