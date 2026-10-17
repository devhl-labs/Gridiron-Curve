[CmdletBinding()]
param(
    [ValidateRange(1869, 9999)]
    [Nullable[int]]$Season,

    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,

    [string]$LogDirectory = (Join-Path $env:LOCALAPPDATA "GridironCurve\Logs")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-NpmCommand {
    param([string[]]$Arguments)

    & $script:NpmExecutable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "npm exited with code $LASTEXITCODE while running: npm $($Arguments -join ' ')"
    }
}

$mutex = [System.Threading.Mutex]::new($false, "GridironCurve-CfbdCacheUpdate")
$hasMutex = $false
$transcriptStarted = $false
$originalLocation = Get-Location

try {
    $hasMutex = $mutex.WaitOne(0)
    if (-not $hasMutex) {
        throw "Another Gridiron Curve cache update is already running."
    }

    $today = Get-Date
    if (-not $PSBoundParameters.ContainsKey("Season")) {
        $isOffseason = $today.Month -ge 3 -and ($today.Month -lt 8 -or ($today.Month -eq 8 -and $today.Day -lt 15))
        if ($isOffseason) {
            Write-Host "No active college-football season; no update is needed."
            exit 0
        }
        $Season = if ($today.Month -le 2) {
            $today.Year - 1
        }
        else {
            $today.Year
        }
    }

    $resolvedRepository = (Resolve-Path $RepositoryRoot).Path
    if (-not (Test-Path (Join-Path $resolvedRepository "package.json"))) {
        throw "The repository root does not contain package.json: $resolvedRepository"
    }

    $repositoryNpm = Join-Path $resolvedRepository ".tools\node\npm.cmd"
    $script:NpmExecutable = if (Test-Path $repositoryNpm) {
        $repositoryNpm
    }
    else {
        (Get-Command "npm.cmd" -ErrorAction Stop).Source
    }
    New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
    $logPath = Join-Path $LogDirectory "cfbd-update-$((Get-Date).ToString('yyyyMMdd-HHmmss')).log"
    Start-Transcript -Path $logPath -Force | Out-Null
    $transcriptStarted = $true

    Get-ChildItem -Path $LogDirectory -Filter "cfbd-update-*.log" -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip 40 |
        Remove-Item -Force

    Set-Location $resolvedRepository
    Write-Host "Updating Gridiron Curve CFBD cache for the latest completed week of $Season."
    Invoke-NpmCommand -Arguments @("run", "sync", "--", "$Season")
    Invoke-NpmCommand -Arguments @("run", "upload:cache")
    Write-Host "CFBD cache update and Azure upload completed successfully."
}
catch {
    Write-Error $_
    exit 1
}
finally {
    Set-Location $originalLocation
    if ($transcriptStarted) {
        Stop-Transcript | Out-Null
    }
    if ($hasMutex) {
        $mutex.ReleaseMutex()
    }
    $mutex.Dispose()
}
