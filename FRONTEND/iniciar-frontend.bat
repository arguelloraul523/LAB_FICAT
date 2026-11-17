@echo off
title Frontend - Laboratorio SENA
cd /d "%~dp0"

if not exist node_modules (
  echo.
  echo === Instalando dependencias del frontend (solo la primera vez, puede tardar) ===
  call npm install
)

echo.
echo === Arrancando el frontend en http://localhost:5173 ===
echo === Deja esta ventana abierta ===
echo.
call npm run dev

pause
