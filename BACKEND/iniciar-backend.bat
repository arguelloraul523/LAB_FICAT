@echo off
title Backend - Laboratorio SENA
cd /d "%~dp0"

if not exist node_modules (
  echo.
  echo === Instalando dependencias del backend (solo la primera vez, puede tardar) ===
  call npm install
  echo.
  echo === Sembrando datos iniciales (roles, admin, tipologias) ===
  call npm run seed
)

echo.
echo === Arrancando el backend en http://localhost:3000 ===
echo === Deja esta ventana abierta ===
echo.
call npm run dev

pause
