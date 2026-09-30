[CmdletBinding()]
param(
    [string]$GraphBaseUrl = "https://graph.microsoft.com/v1.0",
    [switch]$PermissionReviewConfirmed
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Check {
    param([string]$Name, [string]$State, [string]$Detail)
    $suffix = if ([string]::IsNullOrWhiteSpace($Detail)) { "" } else { " ($Detail)" }
    Write-Output ("{0}={1}{2}" -f $Name, $State, $suffix)
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

if (-not $PermissionReviewConfirmed) {
    throw "Review Entra API permissions first. Confirm DeviceManagementManagedDevices.Read.All is present and Intune ReadWrite permissions are absent, then rerun with -PermissionReviewConfirmed."
}

# Microsoft access tokens are client-opaque credentials. This script intentionally
# does not parse or validate token claims; Microsoft Graph is the resource server.
Write-Check "permission.review" "confirmed" "manual least-privilege review completed"
Write-Check "token.format" "opaque" "contents intentionally not inspected"

$select = [Uri]::EscapeDataString("id,azureADDeviceId,serialNumber,manufacturer,model,operatingSystem,osVersion,lastSyncDateTime,complianceState")
try {
    $deviceResponse = Invoke-GraphRead "deviceManagement/managedDevices?`$top=1&`$select=$select" $token
} catch {
    Write-Check "graph.managedDevices" "unavailable" "GET failed; details suppressed"
    throw "Microsoft Graph managedDevices read probe failed. Review consent, licensing and network access without copying the upstream response into Git."
}

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
