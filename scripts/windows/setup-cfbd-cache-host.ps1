[CmdletBinding()]
param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,

    [string]$TaskName = "Gridiron Curve CFBD Cache Update",

    [string]$TaskPath = "\CFBD\"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Test-EnvironmentSetting {
    param(
        [string]$Name,
        [string]$EnvironmentFile
    )

    if ([Environment]::GetEnvironmentVariable($Name, "Process") -or
        [Environment]::GetEnvironmentVariable($Name, "User") -or
        [Environment]::GetEnvironmentVariable($Name, "Machine")) {
        return $true
    }
    if (-not (Test-Path $EnvironmentFile)) {
        return $false
    }
    $pattern = "(?m)^\s*" + [Regex]::Escape($Name) + "\s*=\s*(?!\s*(?:#.*)?$).+"
    return [Regex]::IsMatch(
        [IO.File]::ReadAllText($EnvironmentFile),
        $pattern
    )
}

function Invoke-NpmCommand {
    param(
        [string]$NpmExecutable,
        [string[]]$Arguments
    )

    & $NpmExecutable @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "npm exited with code $LASTEXITCODE while running: npm $($Arguments -join ' ')"
    }
}

function Add-DirectoryToProcessPath {
    param([string]$Directory)

    $normalizedDirectory = $Directory.TrimEnd("\")
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Process")
    $pathEntries = if ($currentPath) {
        $currentPath.Split([IO.Path]::PathSeparator)
    }
    else {
        @()
    }
    if ($pathEntries | Where-Object {
        $_.TrimEnd("\") -ieq $normalizedDirectory
    }) {
        return
    }

    $updatedPath = if ($currentPath) {
        "$Directory$([IO.Path]::PathSeparator)$currentPath"
    }
    else {
        $Directory
    }
    [Environment]::SetEnvironmentVariable(
        "Path",
        $updatedPath,
        "Process"
    )
}

$resolvedRepository = (Resolve-Path $RepositoryRoot).Path
$versionFile = Join-Path $resolvedRepository ".nvmrc"
$packageLock = Join-Path $resolvedRepository "package-lock.json"
if (-not (Test-Path $versionFile) -or -not (Test-Path $packageLock)) {
    throw "The repository root must contain .nvmrc and package-lock.json: $resolvedRepository"
}

$environmentFile = Join-Path $resolvedRepository ".env"
$requiredSettings = @(
    "CFBD_API_KEY"
    "CFBD_CONTAINER_SAS_URL"
    "CFBD_CONTAINER_SAS_TOKEN"
)
$missingSettings = @(
    $requiredSettings | Where-Object {
        -not (Test-EnvironmentSetting -Name $_ -EnvironmentFile $environmentFile)
    }
)
if ($missingSettings.Count -gt 0) {
    $exampleFile = Join-Path $resolvedRepository ".env.example"
    if (-not (Test-Path $environmentFile) -and (Test-Path $exampleFile)) {
        Copy-Item $exampleFile $environmentFile
    }
    throw "Configure these settings in $environmentFile before setup: $($missingSettings -join ', ')"
}

$requiredMajor = [int](Get-Content $versionFile -Raw).Trim()
$toolsDirectory = Join-Path $resolvedRepository ".tools"
$nodeDirectory = Join-Path $toolsDirectory "node"
$nodeExecutable = Join-Path $nodeDirectory "node.exe"
$npmExecutable = Join-Path $nodeDirectory "npm.cmd"
$installedVersion = if (Test-Path $nodeExecutable) {
    (& $nodeExecutable --version).Trim()
}
else {
    $null
}

if (-not $installedVersion -or
    -not $installedVersion.StartsWith("v$requiredMajor.")) {
    Write-Host "Installing a repository-local Node.js $requiredMajor runtime."
    $releases = Invoke-RestMethod "https://nodejs.org/dist/index.json"
    $release = $releases |
        Where-Object {
            $_.version.StartsWith("v$requiredMajor.") -and
            $_.files -contains "win-x64-zip"
        } |
        Select-Object -First 1
    if (-not $release) {
        throw "Node.js did not publish a Windows x64 ZIP for major version $requiredMajor."
    }

    $archiveName = "node-$($release.version)-win-x64.zip"
    $releaseBaseUrl = "https://nodejs.org/dist/$($release.version)"
    $temporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) "gridiron-curve-node-$PID"
    $archivePath = Join-Path $temporaryDirectory $archiveName
    $checksumsPath = Join-Path $temporaryDirectory "SHASUMS256.txt"
    try {
        New-Item -ItemType Directory -Path $temporaryDirectory -Force | Out-Null
        Invoke-WebRequest "$releaseBaseUrl/$archiveName" -OutFile $archivePath
        Invoke-WebRequest "$releaseBaseUrl/SHASUMS256.txt" -OutFile $checksumsPath

        $checksumLine = Get-Content $checksumsPath |
            Where-Object { $_ -match "\s+$([Regex]::Escape($archiveName))$" } |
            Select-Object -First 1
        if (-not $checksumLine) {
            throw "The Node.js checksum list does not contain $archiveName."
        }
        $expectedChecksum = ($checksumLine -split "\s+")[0].ToUpperInvariant()
        $actualChecksum = (Get-FileHash $archivePath -Algorithm SHA256).Hash
        if ($actualChecksum -ne $expectedChecksum) {
            throw "The Node.js archive checksum does not match the published SHA-256 value."
        }

        $expandedDirectory = Join-Path $temporaryDirectory "expanded"
        Expand-Archive $archivePath -DestinationPath $expandedDirectory
        $expandedNodeDirectory = Get-ChildItem $expandedDirectory -Directory |
            Select-Object -First 1
        if (-not $expandedNodeDirectory) {
            throw "The Node.js archive did not contain its expected directory."
        }

        New-Item -ItemType Directory -Path $toolsDirectory -Force | Out-Null
        if (Test-Path $nodeDirectory) {
            Remove-Item $nodeDirectory -Recurse -Force
        }
        Move-Item $expandedNodeDirectory.FullName $nodeDirectory
    }
    finally {
        if (Test-Path $temporaryDirectory) {
            Remove-Item $temporaryDirectory -Recurse -Force
        }
    }
}
else {
    Write-Host "Using repository-local Node.js $installedVersion."
}

if (-not (Test-Path $npmExecutable)) {
    throw "npm was not installed with the repository-local Node.js runtime."
}

Add-DirectoryToProcessPath -Directory $nodeDirectory
if ((Get-Command "node.exe" -ErrorAction Stop).Source -ne $nodeExecutable) {
    throw "The repository-local Node.js runtime is not first on the process PATH."
}

$originalLocation = Get-Location
try {
    Set-Location $resolvedRepository
    Invoke-NpmCommand -NpmExecutable $npmExecutable -Arguments @("ci")
}
finally {
    Set-Location $originalLocation
}

$installer = Join-Path $resolvedRepository "scripts\windows\install-cfbd-cache-task.ps1"
& $installer `
    -RepositoryRoot $resolvedRepository `
    -TaskName $TaskName `
    -TaskPath $TaskPath
if (-not $?) {
    throw "The scheduled-task installer did not complete successfully."
}

Write-Host "Gridiron Curve cache host setup completed."
Write-Host "Node.js: $(& $nodeExecutable --version)"
Write-Host "npm: $(& $npmExecutable --version)"
