[CmdletBinding()]
param(
    [string]$GraphBaseUrl = "https://graph.microsoft.com/v1.0",
    [switch]$AllowOverprivilegedToken
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Check {
    param([string]$Name, [string]$State, [string]$Detail)
    $suffix = if ([string]::IsNullOrWhiteSpace($Detail)) { "" } else { " ($Detail)" }
    Write-Output ("{0}={1}{2}" -f $Name, $State, $suffix)
}

function ConvertFrom-Base64Url {
    param([string]$Value)
    $normalized = $Value.Replace("-", "+").Replace("_", "/")
    switch ($normalized.Length % 4) {
        2 { $normalized += "==" }
        3 { $normalized += "=" }
        0 { }
        default { throw "JWT payload has invalid base64url length." }
    }
    [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($normalized))
}

function Get-TokenPermissions {
    param([string]$AccessToken)
    $parts = $AccessToken.Split(".")
    if ($parts.Count -lt 2) { throw "NEXUS_INTUNE_ACCESS_TOKEN is not JWT-shaped." }
    $claims = (ConvertFrom-Base64Url $parts[1]) | ConvertFrom-Json
    $permissions = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    if ($null -ne $claims.roles) {
        foreach ($role in @($claims.roles)) {
            if ($role -is [string] -and $role.Trim()) { [void]$permissions.Add($role) }
        }
    }
    if ($null -ne $claims.scp -and $claims.scp -is [string]) {
        foreach ($scope in $claims.scp.Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)) {
            [void]$permissions.Add($scope)
        }
    }
    $permissions
}

function Invoke-GraphRead {
    param([string]$Path, [string]$AccessToken)
    $base = $GraphBaseUrl.TrimEnd("/")
    $uri = "$base/$($Path.TrimStart([char]47))"
    Invoke-RestMethod -Method Get -Uri $uri -Headers @{ Authorization = "Bearer $AccessToken"; Accept = "application/json" } -MaximumRedirection 0 -TimeoutSec 30
}

$token = $env:NEXUS_INTUNE_ACCESS_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Set NEXUS_INTUNE_ACCESS_TOKEN in the current process environment. Never pass or commit the token."
}

if ($GraphBaseUrl -ne "https://graph.microsoft.com/v1.0") {
    throw "V02-023 preflight is pinned to Microsoft Graph v1.0. Beta is intentionally excluded."
}

$permissions = @(Get-TokenPermissions $token)
$hasManagedRead = $permissions -contains "DeviceManagementManagedDevices.Read.All" -or $permissions -contains "DeviceManagementManagedDevices.ReadWrite.All"
$hasReadWrite = @($permissions | Where-Object { $_ -like "DeviceManagement*.ReadWrite.All" }).Count -gt 0

Write-Check "token.managedDevicesRead" ($(if ($hasManagedRead) { "present" } else { "missing" })) ""
Write-Check "token.intuneReadWrite" ($(if ($hasReadWrite) { "present" } else { "absent" })) ""

if (-not $hasManagedRead) { throw "Token lacks DeviceManagementManagedDevices.Read.All." }
if ($hasReadWrite -and -not $AllowOverprivilegedToken) {
    throw "Token contains Intune ReadWrite permission. Least-privilege preflight refuses it by default."
}

$select = [Uri]::EscapeDataString("id,azureADDeviceId,serialNumber,manufacturer,model,operatingSystem,osVersion,lastSyncDateTime,complianceState")
$deviceResponse = Invoke-GraphRead "deviceManagement/managedDevices?`$top=1&`$select=$select" $token
Write-Check "graph.managedDevices" "reachable" ""

$sample = @($deviceResponse.value) | Select-Object -First 1
if ($null -eq $sample) {
    Write-Check "graph.managedDevices.sample" "unavailable" "zero rows returned"
} else {
    Write-Check "graph.managedDevices.sample" "available" ""
    foreach ($field in @("id","azureADDeviceId","serialNumber","manufacturer","model","operatingSystem","osVersion","lastSyncDateTime","complianceState")) {
        $property = $sample.PSObject.Properties[$field]
        $hasValue = $null -ne $property -and $null -ne $property.Value -and -not [string]::IsNullOrWhiteSpace([string]$property.Value)
        Write-Check "field.$field" ($(if ($hasValue) { "observed" } else { "missing" })) ""
    }
}

try {
    [void](Invoke-GraphRead "deviceManagement/reports" $token)
    Write-Check "graph.reportsContainer" "reachable" ""
} catch {
    Write-Check "graph.reportsContainer" "unavailable" "GET failed; details suppressed"
}

Write-Check "graph.exportJobs.create" "not-probed" "POST excluded from read-only spike"
Write-Check "result" "complete" "no token or device values printed"
