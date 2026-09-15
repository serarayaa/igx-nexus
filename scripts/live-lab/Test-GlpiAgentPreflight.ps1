#requires -Version 5.1

[CmdletBinding()]
param(
    [string]$ExpectedVersion = '1.19',
    [string]$ExpectedTag = 'nexus-live-lab',
    [switch]$AsJson
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
    throw 'Este preflight sólo soporta Windows.'
}

$checks = [System.Collections.Generic.List[object]]::new()

function Add-Check {
    param(
        [Parameter(Mandatory)] [string]$Name,
        [Parameter(Mandatory)] [bool]$Passed,
        [Parameter(Mandatory)] [string]$Value,
        [bool]$Required = $true
    )

    $checks.Add([pscustomobject]@{
        Name     = $Name
        Passed   = $Passed
        Required = $Required
        Value    = $Value
    })
}

function Get-RegistryRoot {
    $candidates = @(
        'HKLM:\SOFTWARE\GLPI-Agent',
        'HKLM:\SOFTWARE\Wow6432Node\GLPI-Agent'
    )

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }

    return $null
}

function Get-OptionalRegistryValue {
    param(
        [Parameter(Mandatory)] [string]$Path,
        [Parameter(Mandatory)] [string]$Name
    )

    try {
        return Get-ItemPropertyValue -LiteralPath $Path -Name $Name -ErrorAction Stop
    }
    catch {
        return $null
    }
}

function Test-Truthy {
    param($Value)

    if ($null -eq $Value) {
        return $false
    }

    $normalized = ([string]$Value).Trim().ToLowerInvariant()
    return $normalized -in @('1', 'true', 'yes', 'on')
}

function Test-LoopbackHost {
    param([Parameter(Mandatory)] [string]$HostName)

    if ($HostName -ieq 'localhost') {
        return $true
    }

    $address = $null
    if ([System.Net.IPAddress]::TryParse($HostName, [ref]$address)) {
        return [System.Net.IPAddress]::IsLoopback($address)
    }

    return $false
}

$registryRoot = Get-RegistryRoot
if ($null -eq $registryRoot) {
    Add-Check -Name 'GLPI Agent registry' -Passed $false -Value 'not-found'
}
else {
    Add-Check -Name 'GLPI Agent registry' -Passed $true -Value 'present'
}

if ($null -ne $registryRoot) {
    $installerPath = Join-Path $registryRoot 'Installer'
    $version = Get-OptionalRegistryValue -Path $installerPath -Name 'Version'
    $versionText = if ($null -eq $version) { 'missing' } else { [string]$version }
    Add-Check -Name 'Agent version' -Passed ($versionText -eq $ExpectedVersion) -Value $versionText

    $service = Get-Service -Name 'glpi-agent' -ErrorAction SilentlyContinue
    Add-Check -Name 'Windows service installed' -Passed ($null -ne $service) -Value $(if ($null -eq $service) { 'missing' } else { 'present' })
    Add-Check -Name 'Windows service running' -Passed ($null -ne $service -and $service.Status -eq 'Running') -Value $(if ($null -eq $service) { 'missing' } else { [string]$service.Status })

    $tasks = Get-OptionalRegistryValue -Path $registryRoot -Name 'tasks'
    $taskNames = @()
    if ($null -ne $tasks) {
        $taskNames = @(
            ([string]$tasks).Split(',') |
                ForEach-Object { $_.Trim().ToLowerInvariant() } |
                Where-Object { $_ -ne '' }
        )
    }
    $onlyInventory = ($taskNames.Count -eq 1 -and $taskNames[0] -eq 'inventory')
    Add-Check -Name 'Only Inventory task enabled' -Passed $onlyInventory -Value $(if ($onlyInventory) { 'Inventory' } else { 'non-compliant' })

    $noHttpd = Get-OptionalRegistryValue -Path $registryRoot -Name 'no-httpd'
    Add-Check -Name 'Embedded HTTP server disabled' -Passed (Test-Truthy $noHttpd) -Value $(if (Test-Truthy $noHttpd) { 'disabled' } else { 'not-disabled' })

    $noP2p = Get-OptionalRegistryValue -Path $registryRoot -Name 'no-p2p'
    Add-Check -Name 'P2P disabled' -Passed (Test-Truthy $noP2p) -Value $(if (Test-Truthy $noP2p) { 'disabled' } else { 'not-disabled' })

    $noSslCheck = Get-OptionalRegistryValue -Path $registryRoot -Name 'no-ssl-check'
    Add-Check -Name 'TLS verification enabled' -Passed (-not (Test-Truthy $noSslCheck)) -Value $(if (Test-Truthy $noSslCheck) { 'disabled' } else { 'enabled' })

    $scanHomeDirs = Get-OptionalRegistryValue -Path $registryRoot -Name 'scan-homedirs'
    Add-Check -Name 'Home directory scan disabled' -Passed (-not (Test-Truthy $scanHomeDirs)) -Value $(if (Test-Truthy $scanHomeDirs) { 'enabled' } else { 'disabled' })

    $scanProfiles = Get-OptionalRegistryValue -Path $registryRoot -Name 'scan-profiles'
    Add-Check -Name 'User profile scan disabled' -Passed (-not (Test-Truthy $scanProfiles)) -Value $(if (Test-Truthy $scanProfiles) { 'enabled' } else { 'disabled' })

    $itemType = Get-OptionalRegistryValue -Path $registryRoot -Name 'itemtype'
    $itemTypeText = if ($null -eq $itemType) { 'missing' } else { [string]$itemType }
    Add-Check -Name 'Inventory item type' -Passed ($itemTypeText -ieq 'Computer') -Value $itemTypeText

    $tag = Get-OptionalRegistryValue -Path $registryRoot -Name 'tag'
    $tagText = if ($null -eq $tag) { 'missing' } else { [string]$tag }
    Add-Check -Name 'Live Lab tag' -Passed ($tagText -eq $ExpectedTag) -Value $(if ($tagText -eq $ExpectedTag) { $ExpectedTag } else { 'non-compliant' })

    $server = Get-OptionalRegistryValue -Path $registryRoot -Name 'server'
    $serverConfigured = -not [string]::IsNullOrWhiteSpace([string]$server)
    Add-Check -Name 'Server target configured' -Passed $serverConfigured -Value $(if ($serverConfigured) { 'present' } else { 'missing' })

    if ($serverConfigured) {
        $firstServer = ([string]$server).Split(',')[0].Trim()
        try {
            $serverUri = [Uri]$firstServer
            $isLoopback = Test-LoopbackHost -HostName $serverUri.Host
            $secureTarget = ($serverUri.Scheme -ieq 'https') -or (($serverUri.Scheme -ieq 'http') -and $isLoopback)
            $safeTargetSummary = '{0}://<redacted> (loopback={1})' -f $serverUri.Scheme.ToLowerInvariant(), $isLoopback.ToString().ToLowerInvariant()
            Add-Check -Name 'Server transport policy' -Passed $secureTarget -Value $safeTargetSummary
        }
        catch {
            Add-Check -Name 'Server transport policy' -Passed $false -Value 'invalid-uri'
        }
    }

    $propertyNames = @((Get-ItemProperty -LiteralPath $registryRoot).PSObject.Properties.Name)
    $oauthClientIdConfigured = $propertyNames -contains 'oauth-client-id'
    $oauthClientSecretConfigured = $propertyNames -contains 'oauth-client-secret'

    if ($oauthClientIdConfigured) {
        $oauthClientIdConfigured = -not [string]::IsNullOrWhiteSpace([string](Get-OptionalRegistryValue -Path $registryRoot -Name 'oauth-client-id'))
    }
    if ($oauthClientSecretConfigured) {
        $oauthClientSecretConfigured = -not [string]::IsNullOrWhiteSpace([string](Get-OptionalRegistryValue -Path $registryRoot -Name 'oauth-client-secret'))
    }

    Add-Check -Name 'OAuth inventory client id configured' -Passed $oauthClientIdConfigured -Value $(if ($oauthClientIdConfigured) { 'present' } else { 'missing' })
    Add-Check -Name 'OAuth inventory client secret configured' -Passed $oauthClientSecretConfigured -Value $(if ($oauthClientSecretConfigured) { 'present' } else { 'missing' })

    $getNetTcpConnection = Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue
    if ($null -ne $getNetTcpConnection) {
        $httpdListener = Get-NetTCPConnection -State Listen -LocalPort 62354 -ErrorAction SilentlyContinue
        Add-Check -Name 'Port 62354 not listening' -Passed ($null -eq $httpdListener) -Value $(if ($null -eq $httpdListener) { 'closed' } else { 'listening' })
    }
    else {
        Add-Check -Name 'Port 62354 not listening' -Passed $true -Value 'not-checked' -Required $false
    }
}

$requiredFailures = @($checks | Where-Object { $_.Required -and -not $_.Passed })
$summary = [pscustomobject]@{
    Passed         = ($requiredFailures.Count -eq 0)
    ExpectedAgent  = $ExpectedVersion
    Checks         = $checks
    FailureCount   = $requiredFailures.Count
}

if ($AsJson) {
    $summary | ConvertTo-Json -Depth 5
}
else {
    $checks | Format-Table -AutoSize Name, Passed, Required, Value
    Write-Host ''
    if ($summary.Passed) {
        Write-Host 'GLPI Agent Live Lab preflight: PASS'
    }
    else {
        Write-Host ('GLPI Agent Live Lab preflight: FAIL ({0} required check(s))' -f $summary.FailureCount)
    }
}

if (-not $summary.Passed) {
    exit 1
}
