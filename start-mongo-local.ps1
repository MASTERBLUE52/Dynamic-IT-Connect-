$mongoBin = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
$cfg = "c:\dynamicitservices\data\mongodb\mongod-local.cfg"
New-Item -ItemType Directory -Force -Path "c:\dynamicitservices\data\mongodb\db" | Out-Null
if (!(Test-Path $mongoBin)) {
  Write-Error "mongod.exe not found at $mongoBin"
  exit 1
}
Start-Process -FilePath $mongoBin -ArgumentList @("--config", $cfg) -WindowStyle Hidden
Start-Sleep -Seconds 2
Test-NetConnection -ComputerName localhost -Port 27017 | Select-Object ComputerName,RemotePort,TcpTestSucceeded
