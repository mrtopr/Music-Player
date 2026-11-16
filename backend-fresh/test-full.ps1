# Start server in background
$p = Start-Process -FilePath 'cmd' -ArgumentList '/c','cd /D D:\CODING\My Projects\Music-Player\backend-fresh && npx tsx --env-file=.env src/server.ts' -WindowStyle Hidden -PassThru
Write-Output "Server process started: $($p.Id)"
Start-Sleep -Seconds 10

# Test server
try {
    $wc = New-Object Net.WebClient
    $result = $wc.DownloadString('http://localhost:3001/')
    Write-Output "SERVER RESPONSE: $result"
    $wc.Dispose()
} catch {
    Write-Output "SERVER ERROR: $($_.Exception.Message)"
}

# Stop server
Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
Write-Output "Server stopped"
