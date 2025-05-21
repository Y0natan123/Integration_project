Write-Host "Starting database cleanup process..."

# Stop any node processes
try {
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "Stopped any running Node.js processes"
}
catch {
    Write-Host "No Node.js processes found or error stopping them"
}

# Wait a moment
Start-Sleep -Seconds 2

# Delete the database file
$dbPath = Join-Path $PSScriptRoot "users.db"
$backupPath = Join-Path $PSScriptRoot "users.db.backup"

# Create a backup if it exists
if (Test-Path $dbPath) {
    try {
        Write-Host "Database file found at: $dbPath"
        Write-Host "Creating backup..."
        Copy-Item -Path $dbPath -Destination $backupPath -Force
        Write-Host "Backup created at: $backupPath"
        
        # Try to remove the database file
        Remove-Item -Path $dbPath -Force -ErrorAction Stop
        Write-Host "Successfully removed old database file"
    }
    catch {
        Write-Host "Error while managing database file: $_"
        Write-Host "Make sure no other processes are using the file"
        exit 1
    }
}
else {
    Write-Host "No existing database file found, will create new one"
}

Write-Host "Database reset successful! Start the server with 'node server.js' to create a new database." 