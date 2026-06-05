param(
    [int]$CorePort = 9100,
    [int]$ApiPort = 8000
)

Write-Host "=== VisionVial Startup ===" -ForegroundColor Cyan

# Kill any existing servers
Get-Process -Name "python*" -ErrorAction SilentlyContinue | Stop-Process -Force

Start-Sleep -Seconds 1

Write-Host "[1/2] Starting Core (ML server) on port $CorePort..." -ForegroundColor Yellow
$core = Start-Process -NoNewWindow -FilePath "py" -ArgumentList "server.py --port $CorePort" -WorkingDirectory "$PSScriptRoot\..\core" -PassThru
Start-Sleep -Seconds 3

if (-not $core.HasExited) {
    Write-Host "[OK] Core running on 127.0.0.1:$CorePort" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Core failed to start" -ForegroundColor Red
    exit 1
}

Write-Host "[2/2] Starting API Gateway on port $ApiPort..." -ForegroundColor Yellow
$env:CORE_HOST = "127.0.0.1"
$env:CORE_PORT = "$CorePort"
$api = Start-Process -NoNewWindow -FilePath "py" -ArgumentList "-m uvicorn api.main:app --host 0.0.0.0 --port $ApiPort --reload" -WorkingDirectory "$PSScriptRoot\..\backend" -PassThru
Start-Sleep -Seconds 3

Write-Host "[OK] API running on http://localhost:$ApiPort" -ForegroundColor Green
Write-Host ""
Write-Host "=== Endpoints ===" -ForegroundColor Cyan
Write-Host "  Frontend:    http://localhost:$ApiPort"
Write-Host "  API Docs:    http://localhost:$ApiPort/docs"
Write-Host "  ML (real):   http://localhost:$ApiPort/api/v1/predict/congestion?hora=8"
Write-Host "  ML (fake):   http://localhost:$ApiPort/api/v1/predict/fake/congestion"
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Gray

# Wait for user input
try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    $core | Stop-Process -Force
    $api | Stop-Process -Force
}
