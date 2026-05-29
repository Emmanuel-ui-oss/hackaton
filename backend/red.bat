@echo off
cd /d "%~dp0"
title Transporte y Riesgos - Red

:MENU
cls
echo ============================================
echo   GESTION DE RED LOCAL
echo   Transporte y Riesgos - Medellin
echo ============================================
echo.
echo   Opciones:
echo     1) Ver mis IPs
echo     2) Abrir configuracion de Zona WiFi movil
echo     3) Probar conexion a internet
echo     4) Mostrar instrucciones para otros dispositivos
echo     5) Salir
echo.

set /p op="Selecciona una opcion: "

if "%op%"=="1" goto IPS
if "%op%"=="2" goto HOTSPOT
if "%op%"=="3" goto PING
if "%op%"=="4" goto INSTRUCCIONES
if "%op%"=="5" exit /b
goto MENU

:IPS
cls
echo [DIRECCIONES IP]
echo.
echo   Accede al servidor desde cualquier dispositivo
echo   usando alguna de estas direcciones:
echo.
ipconfig | findstr /i "IPv4"
echo.
echo   El servidor debe estar corriendo (iniciar.bat)
echo   Puerto: 8000
echo.
pause
goto MENU

:HOTSPOT
cls
echo [ZONA WIFI MOVIL]
echo.
echo   En Windows 10/11:
echo.
echo   1. Se abrira la configuracion de Zona WiFi movil
echo   2. Activa "Usar mi conexion de Internet en otros dispositivos"
echo   3. Configura:
echo      - Nombre de red: TransRiesgos
echo      - Contrasena: transporte2025
echo   4. El IP del servidor sera: http://192.168.137.1:8000
echo.
echo   NOTA: No necesitas internet para crear esta red.
echo   El hotspot funciona aunque no tengas internet.
echo.
pause
start ms-settings:network-mobilehotspot
goto MENU

:PING
cls
echo [PRUEBA DE CONEXION]
echo.
ping -n 2 8.8.8.8 >nul 2>&1
if %errorlevel%==0 (
   echo   INTERNET: CONECTADO
   echo   El servidor es accesible desde internet (si tienes IP publica)
) else (
   echo   INTERNET: SIN CONEXION
   echo   Usa la Zona WiFi movil para crear una red local
   echo   Otros dispositivos se conectan a tu red y entran a:
   echo   http://192.168.137.1:8000
)
echo.
pause
goto MENU

:INSTRUCCIONES
cls
echo [INSTRUCCIONES PARA OTROS DISPOSITIVOS]
echo.
echo   === PARA CONECTARSE A LA RED LOCAL ===
echo.
echo   1. Conectate a la red WiFi del servidor:
echo      - Nombre: TransRiesgos  (o la red local que uses)
echo      - Clave:  transporte2025
echo.
echo   2. Abre el navegador y visita:
echo      http://192.168.137.1:8000
echo.
echo   3. Inicia sesion con:
echo      - Usuario: demo
echo      - Clave:   demo123
echo.
echo   --- SIN INTERNET? ---
echo   No hay problema. La red local funciona sin internet.
echo   Solo necesitas que el servidor este encendido.
echo.
pause
goto MENU
