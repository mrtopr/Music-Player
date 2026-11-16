$p = Start-Process -FilePath 'npx' -ArgumentList 'tsx','--env-file=.env','src/server.ts' -WorkingDirectory 'D:\CODING\My Projects\Music-Player\backend-fresh' -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 5
$resp = Invoke-RestMethod -Uri 'http://localhost:3001/' -Method Get
$resp | ConvertTo-Json -Depth 2
Stop-Process -Id $p.Id -Force
