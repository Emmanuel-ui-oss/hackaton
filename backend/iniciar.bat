@echo off
cd /d "%~dp0"
title Transporte y Riesgos - Servidor

echo ============================================
echo   TRANSPORTE y RIESGOS - Medellin
echo   Servidor todo-en-uno
echo ============================================
echo.

:: Mostrar IPs del equipo
echo [RED] Direcciones IP disponibles:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
   for /f "tokens=*" %%b in ("%%a") do (
      echo     http://%%b:8000
   )
)
echo.

:: Verificar si hay WiFi
netsh wlan show interfaces | findstr /i "Estado" | findstr /i "conectado" >nul 2>&1
if %errorlevel%==0 (
   echo [WIFI] Conectado a una red WiFi
) else (
   echo [WIFI] No conectado a WiFi
)
echo.

:: Verificar hotspot de Windows
netsh wlan show hostednetwork | findstr /i "Estado" | findstr /i "iniciada" >nul 2>&1
if %errorlevel%==0 (
   echo [HOTSPOT] Red local activa: TransRiesgos
   for /f "tokens=2 delims=:" %%a in ('netsh wlan show hostednetwork ^| findstr /i "Direccion IPv4"') do (
      for /f "tokens=*" %%b in ("%%a") do echo     http://%%b:8000
   )
) else (
   echo [HOTSPOT] Red local no detectada
   echo     Para crear una red sin internet, abre:
   echo     Inicio ^> Configuracion ^> Red e Internet ^> Zona WiFi movil
   echo     O ejecuta: red.bat
)
echo.

:: Iniciar servidor
echo [SERVIDOR] Iniciando FastAPI en http://0.0.0.0:8000
echo ============================================
echo.
echo   Usuarios seed:   admin : admin123
echo                     demo  : demo123
echo.
echo   Abre http://localhost:8000 en este equipo
echo   O usa http://IP_DEL_EQUIPO:8000 desde otros dispositivos
echo.
echo   Presiona CTRL+C para detener el servidor
echo ============================================
echo.

"C:\Users\emman\AppData\Local\Python\bin\python.exe" -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 1

if %errorlevel% neq 0 (
   echo.
   echo [ERROR] No se pudo iniciar el servidor.
   echo   Verifica que python tenga los paquetes instalados:
   echo   pip install -r requirements.txt
   pause
)
