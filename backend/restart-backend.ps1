$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$log = Join-Path $root 'backend.log'

Write-Output '--- killing existing backend processes ---'
# Only processes whose command line points into *this* backend folder, so the
# frontend dev server is never touched.
$procs = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and $_.CommandLine -like "*$root*" -and
    ($_.Name -eq 'node.exe' -or $_.Name -eq 'cmd.exe' -or $_.Name -eq 'npx.exe')
}
foreach ($p in $procs) {
    Write-Output ("kill {0} {1}" -f $p.ProcessId, $p.Name)
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 3

if (Test-Path $log) { Remove-Item $log -Force }

Write-Output '--- starting backend ---'
Start-Process -FilePath 'cmd' `
  -ArgumentList '/c',"cd /D `"$root`" && npx tsx --env-file=.env src/server.ts > backend.log 2>&1" `
  -WindowStyle Hidden

$ok = $false
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri 'http://localhost:3001/' -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) { $ok = $true; break }
    } catch {}
}
Write-Output "ready: $ok"
Start-Sleep -Seconds 1
Write-Output '--- backend.log ---'
if (Test-Path $log) { Get-Content $log -Tail 30 } else { Write-Output 'no log file' }
