#requires -Version 5.1

[CmdletBinding()]
param(
    [ValidateRange(1, 30)]
    [int]$LookbackDays = 14,
    [switch]$AsJson
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
    throw 'Este probe sólo soporta Windows.'
}

$signals = [System.Collections.Generic.List[object]]::new()

function Add-Signal {
    param(
        [Parameter(Mandatory)] [string]$Source,
        [Parameter(Mandatory)] [string]$Name,
        [Parameter(Mandatory)] [string]$State,
        [Parameter(Mandatory)] [string]$Value,
        [string]$Note = ''
    )

    $signals.Add([pscustomobject]@{
        Source = $Source
        Name   = $Name
        State  = $State
        Value  = $Value
        Note   = $Note
    })
}

function Add-UnavailableSignal {
    param(
        [Parameter(Mandatory)] [string]$Source,
        [Parameter(Mandatory)] [string]$Name,
        [Parameter(Mandatory)] [System.Management.Automation.ErrorRecord]$ErrorRecord
    )

    $state = if ($ErrorRecord.Exception -is [System.UnauthorizedAccessException]) { 'access-denied' } else { 'unavailable' }
    Add-Signal -Source $Source -Name $Name -State $state -Value 'not-observed' -Note 'details-suppressed'
}

function Get-SafeCimCount {
    param(
        [Parameter(Mandatory)] [string]$Namespace,
        [Parameter(Mandatory)] [string]$ClassName,
        [Parameter(Mandatory)] [string]$SignalName
    )

    try {
        [void](Get-CimClass -Namespace $Namespace -ClassName $ClassName -ErrorAction Stop)
        $instances = @(Get-CimInstance -Namespace $Namespace -ClassName $ClassName -ErrorAction Stop)
        Add-Signal -Source 'DellCommandMonitor' -Name $SignalName -State 'observed' -Value ([string]$instances.Count)
    }
    catch {
        Add-UnavailableSignal -Source 'DellCommandMonitor' -Name $SignalName -ErrorRecord $_
    }
}

function Get-DellCommandMonitorVersion {
    $paths = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
    )

    foreach ($path in $paths) {
        try {
            $entry = Get-ItemProperty -Path $path -ErrorAction SilentlyContinue |
                Where-Object { $_.DisplayName -like 'Dell Command*Monitor*' } |
                Select-Object -First 1

            if ($null -ne $entry) {
                if (-not [string]::IsNullOrWhiteSpace([string]$entry.DisplayVersion)) { return [string]$entry.DisplayVersion }
                return 'present-version-unknown'
            }
        }
        catch { }
    }

    return $null
}

$now = Get-Date
$startTime = $now.AddDays(-$LookbackDays)

try {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    $isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    Add-Signal -Source 'Runtime' -Name 'elevated' -State 'observed' -Value $(if ($isAdmin) { 'yes' } else { 'no' }) -Note 'probe-never-auto-elevates'
}
catch {
    Add-Signal -Source 'Runtime' -Name 'elevated' -State 'unavailable' -Value 'unknown' -Note 'details-suppressed'
}

try {
    $os = Get-CimInstance -ClassName Win32_OperatingSystem -Property LastBootUpTime,Version,BuildNumber -ErrorAction Stop
    Add-Signal -Source 'WindowsCIM' -Name 'operatingSystem' -State 'observed' -Value 'available'
    if ($null -ne $os.LastBootUpTime) {
        $uptime = $now - $os.LastBootUpTime
        Add-Signal -Source 'WindowsCIM' -Name 'uptimeHours' -State 'observed' -Value ([math]::Floor($uptime.TotalHours).ToString())
    }
    $build = '{0}.{1}' -f [string]$os.Version, [string]$os.BuildNumber
    Add-Signal -Source 'WindowsCIM' -Name 'osBuild' -State 'observed' -Value $build
}
catch {
    Add-UnavailableSignal -Source 'WindowsCIM' -Name 'operatingSystem' -ErrorRecord $_
}

try {
    $computer = Get-CimInstance -ClassName Win32_ComputerSystem -Property Manufacturer,TotalPhysicalMemory -ErrorAction Stop
    $manufacturer = ([string]$computer.Manufacturer).ToLowerInvariant()
    $manufacturerClass = if ($manufacturer -like '*dell*') { 'dell' } elseif ([string]::IsNullOrWhiteSpace($manufacturer)) { 'unknown' } else { 'other' }
    Add-Signal -Source 'WindowsCIM' -Name 'manufacturerClass' -State 'observed' -Value $manufacturerClass
    if ($null -ne $computer.TotalPhysicalMemory -and [uint64]$computer.TotalPhysicalMemory -gt 0) {
        $memoryGiB = [math]::Round(([double]$computer.TotalPhysicalMemory / 1GB), 1)
        Add-Signal -Source 'WindowsCIM' -Name 'memoryGiB' -State 'observed' -Value ([string]$memoryGiB)
    }
}
catch {
    Add-UnavailableSignal -Source 'WindowsCIM' -Name 'computerSystem' -ErrorRecord $_
}

try {
    $batteries = @(Get-CimInstance -ClassName Win32_Battery -Property BatteryStatus,EstimatedChargeRemaining,FullChargeCapacity,DesignCapacity -ErrorAction Stop)
    Add-Signal -Source 'WindowsCIM' -Name 'batteryInstances' -State 'observed' -Value ([string]$batteries.Count)
    if ($batteries.Count -gt 0) {
        $chargeKnown = @($batteries | Where-Object { $null -ne $_.EstimatedChargeRemaining -and [uint32]$_.EstimatedChargeRemaining -le 100 }).Count
        $capacityKnown = @($batteries | Where-Object {
            $null -ne $_.FullChargeCapacity -and $null -ne $_.DesignCapacity -and [uint32]$_.FullChargeCapacity -gt 0 -and [uint32]$_.DesignCapacity -gt 0
        }).Count
        Add-Signal -Source 'WindowsCIM' -Name 'batteryChargeCoverage' -State 'observed' -Value ('{0}/{1}' -f $chargeKnown, $batteries.Count) -Note 'values-suppressed'
        Add-Signal -Source 'WindowsCIM' -Name 'batteryCapacityCoverage' -State 'observed' -Value ('{0}/{1}' -f $capacityKnown, $batteries.Count) -Note 'values-suppressed'
    }
}
catch {
    Add-UnavailableSignal -Source 'WindowsCIM' -Name 'battery' -ErrorRecord $_
}

try {
    [void](Get-CimClass -Namespace 'root\cimv2' -ClassName 'Win32_ReliabilityRecords' -ErrorAction Stop)
    Add-Signal -Source 'WindowsCIM' -Name 'reliabilityRecordsClass' -State 'observed' -Value 'available' -Note 'records-not-exported'
}
catch {
    Add-UnavailableSignal -Source 'WindowsCIM' -Name 'reliabilityRecordsClass' -ErrorRecord $_
}

$eventDefinitions = @(
    [pscustomobject]@{ Name = 'osStart';                Id = 12;   Provider = 'Microsoft-Windows-Kernel-General' },
    [pscustomobject]@{ Name = 'osShutdown';             Id = 13;   Provider = 'Microsoft-Windows-Kernel-General' },
    [pscustomobject]@{ Name = 'unexpectedRestart';      Id = 41;   Provider = 'Microsoft-Windows-Kernel-Power' },
    [pscustomobject]@{ Name = 'bugcheckRestart';        Id = 1001; Provider = 'Microsoft-Windows-WER-SystemErrorReporting' },
    [pscustomobject]@{ Name = 'initiatedRestart';       Id = 1074; Provider = 'User32' },
    [pscustomobject]@{ Name = 'eventLogServiceStarted'; Id = 6005; Provider = 'EventLog' },
    [pscustomobject]@{ Name = 'unexpectedShutdown';     Id = 6008; Provider = 'EventLog' },
    [pscustomobject]@{ Name = 'windowsBoot';            Id = 6009; Provider = 'EventLog' }
)

try {
    $ids = @($eventDefinitions | Select-Object -ExpandProperty Id -Unique)
    $events = @(Get-WinEvent -FilterHashtable @{ LogName = 'System'; StartTime = $startTime; Id = $ids } -ErrorAction Stop)
    Add-Signal -Source 'WindowsEventLog' -Name 'systemLog' -State 'observed' -Value 'available'
    Add-Signal -Source 'WindowsEventLog' -Name 'lookbackDays' -State 'observed' -Value ([string]$LookbackDays)
    foreach ($definition in $eventDefinitions) {
        $count = @($events | Where-Object { $_.Id -eq $definition.Id -and $_.ProviderName -ieq $definition.Provider }).Count
        Add-Signal -Source 'WindowsEventLog' -Name $definition.Name -State 'observed' -Value ([string]$count) -Note ('provider={0};id={1};messages-suppressed' -f $definition.Provider, $definition.Id)
    }
}
catch {
    Add-UnavailableSignal -Source 'WindowsEventLog' -Name 'systemLog' -ErrorRecord $_
}

$dcmVersion = Get-DellCommandMonitorVersion
if ($null -eq $dcmVersion) {
    Add-Signal -Source 'DellCommandMonitor' -Name 'installation' -State 'unavailable' -Value 'not-detected' -Note 'no-install-attempted'
}
else {
    Add-Signal -Source 'DellCommandMonitor' -Name 'installation' -State 'observed' -Value 'present'
    Add-Signal -Source 'DellCommandMonitor' -Name 'version' -State 'observed' -Value $dcmVersion
}

try {
    [void](Get-CimClass -Namespace 'root\DCIM\SYSMAN' -ClassName 'DCIM_ComputerSystem' -ErrorAction Stop)
    Add-Signal -Source 'DellCommandMonitor' -Name 'namespace' -State 'observed' -Value 'root/DCIM/SYSMAN'
    Get-SafeCimCount -Namespace 'root\DCIM\SYSMAN' -ClassName 'DCIM_Battery' -SignalName 'batteryInstances'
    Get-SafeCimCount -Namespace 'root\DCIM\SYSMAN' -ClassName 'DCIM_Fan' -SignalName 'fanInstances'
    Get-SafeCimCount -Namespace 'root\DCIM\SYSMAN' -ClassName 'DCIM_ThermalInformation' -SignalName 'thermalInformationInstances'
    Get-SafeCimCount -Namespace 'root\DCIM\SYSMAN' -ClassName 'DCIM_NumericSensor' -SignalName 'numericSensorInstances'
    Get-SafeCimCount -Namespace 'root\DCIM\SYSMAN' -ClassName 'DCIM_MemoryError' -SignalName 'memoryErrorInstances'
}
catch {
    Add-UnavailableSignal -Source 'DellCommandMonitor' -Name 'namespace' -ErrorRecord $_
}

$observed = @($signals | Where-Object { $_.State -eq 'observed' }).Count
$unavailable = @($signals | Where-Object { $_.State -ne 'observed' }).Count

$summary = [pscustomobject]@{
    Probe            = 'V02-024 Windows / Dell Lab Telemetry'
    LookbackDays     = $LookbackDays
    CollectionMode   = 'local-read-only'
    RawMessagesRead  = $false
    RemoteCollection = $false
    Signals          = $signals
    ObservedCount    = $observed
    UnavailableCount = $unavailable
}

if ($AsJson) {
    $summary | ConvertTo-Json -Depth 5
}
else {
    $signals | Format-Table -AutoSize Source, Name, State, Value, Note
    Write-Host ''
    Write-Host ('V02-024 probe complete: observed={0}, unavailable={1}' -f $observed, $unavailable)
    Write-Host 'No hostname, serial, user, domain, IP/MAC or raw event message was emitted.'
}
