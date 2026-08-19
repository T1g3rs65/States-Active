<# 
    SovereignHex - All-in-One Server Setup
    Just right-click this file and select "Run with PowerShell"
#>

$Host.UI.RawUI.WindowTitle = "SovereignHex Server Setup"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   SOVEREIGNHEX - SERVER SETUP" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$ServerFolder = $PSScriptRoot
$PythonFolder = "$ServerFolder\python"
$PythonExe = "$PythonFolder\python.exe"
$PythonZip = "$ServerFolder\python.zip"
$GetPipPy = "$PythonFolder\get-pip.py"
$ConfigFile = "$ServerFolder\server_config.json"

# Python embeddable download URL (3.11.9)
$PythonUrl = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip"
$GetPipUrl = "https://bootstrap.pypa.io/get-pip.py"

# Function to download file
function Download-File {
    param($Url, $Output)
    Write-Host "Downloading: $Url" -ForegroundColor Yellow
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($Url, $Output)
        return $true
    } catch {
        Write-Host "ERROR: Failed to download $Url" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        return $false
    }
}

# Check if Python is already set up
$NeedPythonSetup = $false
if (Test-Path $PythonExe) {
    Write-Host "[OK] Python found in server folder" -ForegroundColor Green
} else {
    Write-Host "[!] Python not found - will download portable version" -ForegroundColor Yellow
    $NeedPythonSetup = $true
}

# Download and setup Python if needed
if ($NeedPythonSetup) {
    Write-Host ""
    Write-Host "Setting up Python (one-time download)..." -ForegroundColor Cyan
    
    # Download Python
    if (!(Test-Path $PythonZip)) {
        if (!(Download-File -Url $PythonUrl -Output $PythonZip)) {
            Write-Host "Failed to download Python. Please check your internet connection." -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
    }
    
    # Extract Python
    Write-Host "Extracting Python..." -ForegroundColor Yellow
    if (Test-Path $PythonFolder) {
        Remove-Item $PythonFolder -Recurse -Force
    }
    Expand-Archive -Path $PythonZip -DestinationPath $PythonFolder -Force
    
    # Fix the python311._pth file to enable pip
    $pthFile = Get-ChildItem "$PythonFolder\python*._pth" | Select-Object -First 1
    if ($pthFile) {
        $content = Get-Content $pthFile.FullName
        $content = $content -replace '#import site', 'import site'
        $content | Set-Content $pthFile.FullName
    }
    
    # Download and run get-pip.py
    Write-Host "Installing pip..." -ForegroundColor Yellow
    if (!(Download-File -Url $GetPipUrl -Output $GetPipPy)) {
        Write-Host "Failed to download pip installer." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    & $PythonExe $GetPipPy --no-warn-script-location 2>$null
    
    # Clean up
    if (Test-Path $PythonZip) { Remove-Item $PythonZip -Force }
    if (Test-Path $GetPipPy) { Remove-Item $GetPipPy -Force }
    
    Write-Host "[OK] Python setup complete!" -ForegroundColor Green
}

# Install dependencies
Write-Host ""
Write-Host "Installing/updating dependencies..." -ForegroundColor Cyan

$pipExe = "$PythonFolder\Scripts\pip.exe"
if (!(Test-Path $pipExe)) {
    $pipExe = "$PythonFolder\python.exe -m pip"
}

# Install required packages
& $PythonExe -m pip install --upgrade pip --quiet 2>$null
& $PythonExe -m pip install uvicorn fastapi motor pymongo pydantic python-dotenv httpx starlette --quiet 2>$null

Write-Host "[OK] Dependencies installed!" -ForegroundColor Green

# Check/create config
Write-Host ""
if (!(Test-Path $ConfigFile)) {
    Write-Host "Creating default configuration..." -ForegroundColor Yellow
    
    # Generate random seed
    $randomSeed = Get-Random -Minimum 100000 -Maximum 999999
    
    $defaultConfig = @{
        server_name = "My Nation Server"
        server_description = "A Rise of Nations game server"
        world_seed = $randomSeed
        max_players = 50
        port = 8001
        allow_migration = $true
        visibility = "public"
        emergent_llm_key = ""
        mongo_url = ""
        auto_open_browser = $true
    }
    
    $defaultConfig | ConvertTo-Json | Set-Content $ConfigFile
    Write-Host "[OK] Default config created with seed: $randomSeed" -ForegroundColor Green
}

# Load config
$config = Get-Content $ConfigFile | ConvertFrom-Json

# Check MongoDB connection
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   DATABASE SETUP" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

if ([string]::IsNullOrEmpty($config.mongo_url)) {
    Write-Host ""
    Write-Host "You need a MongoDB database. Choose an option:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  [1] Use MongoDB Atlas (FREE cloud - recommended!)" -ForegroundColor White
    Write-Host "      No installation needed. Just create a free account."
    Write-Host ""
    Write-Host "  [2] Use local MongoDB (must be installed separately)" -ForegroundColor White
    Write-Host "      Default: mongodb://localhost:27017"
    Write-Host ""
    Write-Host "  [3] Enter custom MongoDB URL" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "Select option (1-3)"
    
    switch ($choice) {
        "1" {
            Write-Host ""
            Write-Host "To get your FREE MongoDB Atlas connection:" -ForegroundColor Cyan
            Write-Host "1. Go to: https://www.mongodb.com/cloud/atlas/register" -ForegroundColor White
            Write-Host "2. Create a free account" -ForegroundColor White
            Write-Host "3. Create a FREE cluster (M0 tier)" -ForegroundColor White
            Write-Host "4. Click 'Connect' > 'Connect your application'" -ForegroundColor White
            Write-Host "5. Copy the connection string" -ForegroundColor White
            Write-Host ""
            Write-Host "The URL looks like: mongodb+srv://user:pass@cluster.xxxxx.mongodb.net" -ForegroundColor Yellow
            Write-Host ""
            $mongoUrl = Read-Host "Paste your MongoDB Atlas URL"
            if (![string]::IsNullOrEmpty($mongoUrl)) {
                $config.mongo_url = $mongoUrl
            }
        }
        "2" {
            $config.mongo_url = "mongodb://localhost:27017"
            Write-Host "Using local MongoDB at localhost:27017" -ForegroundColor Green
        }
        "3" {
            $mongoUrl = Read-Host "Enter your MongoDB URL"
            if (![string]::IsNullOrEmpty($mongoUrl)) {
                $config.mongo_url = $mongoUrl
            }
        }
        default {
            $config.mongo_url = "mongodb://localhost:27017"
            Write-Host "Using local MongoDB at localhost:27017" -ForegroundColor Green
        }
    }
    
    # Save config
    $config | ConvertTo-Json | Set-Content $ConfigFile
}

# Server configuration menu
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   SERVER CONFIGURATION" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Current Settings:" -ForegroundColor Yellow
Write-Host "  Server Name:  $($config.server_name)" -ForegroundColor White
Write-Host "  World Seed:   $($config.world_seed)" -ForegroundColor White
Write-Host "  Max Players:  $($config.max_players)" -ForegroundColor White
Write-Host "  Port:         $($config.port)" -ForegroundColor White
Write-Host "  MongoDB:      $($config.mongo_url.Substring(0, [Math]::Min(40, $config.mongo_url.Length)))..." -ForegroundColor White
Write-Host ""

$editConfig = Read-Host "Edit configuration? (y/N)"
if ($editConfig -eq "y" -or $editConfig -eq "Y") {
    Write-Host ""
    $newName = Read-Host "Server Name [$($config.server_name)]"
    if (![string]::IsNullOrEmpty($newName)) { $config.server_name = $newName }
    
    $newSeed = Read-Host "World Seed [$($config.world_seed)]"
    if (![string]::IsNullOrEmpty($newSeed)) { $config.world_seed = [int]$newSeed }
    
    $newPlayers = Read-Host "Max Players [$($config.max_players)]"
    if (![string]::IsNullOrEmpty($newPlayers)) { $config.max_players = [int]$newPlayers }
    
    $newPort = Read-Host "Port [$($config.port)]"
    if (![string]::IsNullOrEmpty($newPort)) { $config.port = [int]$newPort }
    
    # Save config
    $config | ConvertTo-Json | Set-Content $ConfigFile
    Write-Host "[OK] Configuration saved!" -ForegroundColor Green
}

# Create environment file
$envContent = @"
MONGO_URL=$($config.mongo_url)
DB_NAME=nation_states
SERVER_NAME=$($config.server_name)
SERVER_DESCRIPTION=$($config.server_description)
WORLD_SEED=$($config.world_seed)
MAX_PLAYERS=$($config.max_players)
ALLOW_MIGRATION=$($config.allow_migration.ToString().ToLower())
SERVER_VISIBILITY=$($config.visibility)
"@

if (![string]::IsNullOrEmpty($config.emergent_llm_key)) {
    $envContent += "`nEMERGENT_LLM_KEY=$($config.emergent_llm_key)"
}

$envContent | Set-Content "$ServerFolder\.env"

# Start server
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   STARTING SERVER" -ForegroundColor Cyan  
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server: $($config.server_name)" -ForegroundColor Green
Write-Host "Seed:   $($config.world_seed)" -ForegroundColor Green
Write-Host "Port:   $($config.port)" -ForegroundColor Green
Write-Host ""
Write-Host "Your server will be available at:" -ForegroundColor Yellow
Write-Host "  Local:   http://localhost:$($config.port)" -ForegroundColor White
Write-Host "  Network: http://<your-ip>:$($config.port)" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Open browser
if ($config.auto_open_browser) {
    Start-Process "http://localhost:$($config.port)/api/server/info"
}

# Run the server
Set-Location $ServerFolder
& $PythonExe -m uvicorn server:app --host 0.0.0.0 --port $config.port

Write-Host ""
Write-Host "Server stopped." -ForegroundColor Yellow
Read-Host "Press Enter to exit"
