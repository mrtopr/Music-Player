# Start backend server in background (detached)
$p = Start-Process -FilePath 'cmd' -ArgumentList '/c','cd /D D:\CODING\My Projects\Music-Player\backend-fresh && npx tsx --env-file=.env src/server.ts' -WindowStyle Hidden -PassThru
Write-Output "Backend server started: $($p.Id)"
Start-Sleep -Seconds 8

# Test backend directly
try {
    $wc = New-Object Net.WebClient
    $r1 = $wc.DownloadString('http://localhost:3001/')
    Write-Output "Backend root: $r1"
    $r2 = $wc.DownloadString('http://localhost:3001/api/songs?ids=3IoDK8qI')
    Write-Output "Backend songs: OK"
    $wc.Dispose()
} catch {
    Write-Output "Backend error: $($_.Exception.Message)"
}

# Start frontend in background
$f = Start-Process -FilePath 'cmd' -ArgumentList '/c','cd /D D:\CODING\My Projects\Music-Player\frontend && npm run dev' -WindowStyle Hidden -PassThru
Write-Output "Frontend server started: $($f.Id)"
Start-Sleep -Seconds 10

# Test frontend via backend proxy
try {
    $wc2 = New-Object Net.WebClient
    $r3 = $wc2.DownloadString('http://localhost:5173/api/songs?ids=3IoDK8qI')
    Write-Output "Frontend->Backend proxy: OK"
    $wc2.Dispose()
} catch {
    Write-Output "Frontend proxy error: $($_.Exception.Message)"
}

Write-Output "=== TEST COMPLETE ==="
Write-Output "Backend: http://localhost:3001"
Write-Output "Frontend: http://localhost:5173"
Write-Output "Backend process ID: $($p.Id)"
Write-Output "Frontend process ID: $($f.Id)"

# Keep servers running - do NOT stop them
