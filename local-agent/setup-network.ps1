$TargetIP = "192.168.100.1"
$PrefixLength = 24
$AdapterName = ""

Write-Host "Searching Ethernet adapter..."

if ($AdapterName -eq "") {
    $Adapter = Get-NetAdapter |
        Where-Object {
            $_.Status -eq "Up" -and
            ($_.Name -match "Ethernet" -or $_.InterfaceDescription -match "USB")
        } |
        Select-Object -First 1
} else {
    $Adapter = Get-NetAdapter -Name $AdapterName
}

if (-not $Adapter) {
    Write-Error "No suitable Ethernet adapter found"
    exit 1
}

Write-Host "Using adapter:" $Adapter.Name

# cleanup old IP
Get-NetIPAddress -InterfaceIndex $Adapter.InterfaceIndex -ErrorAction SilentlyContinue |
    Where-Object { $_.AddressFamily -eq "IPv4" } |
    Remove-NetIPAddress -Confirm:$false

# set static IP
New-NetIPAddress `
    -InterfaceIndex $Adapter.InterfaceIndex `
    -IPAddress $TargetIP `
    -PrefixLength $PrefixLength

# firewall bypass
New-NetFirewallRule `
    -DisplayName "AI-Box Access" `
    -Direction Outbound `
    -Action Allow `
    -RemoteAddress 192.168.100.2/24 `
    -Profile Any `
    -ErrorAction SilentlyContinue

Write-Host "Local Network configured successfully"
ipconfig
