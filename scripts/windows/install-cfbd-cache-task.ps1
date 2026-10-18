[CmdletBinding()]
param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,

    [string]$TaskName = "Gridiron Curve CFBD Cache Update",

    [string]$TaskPath = "\CFBD\"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$resolvedRepository = (Resolve-Path $RepositoryRoot).Path
$trimmedTaskPath = $TaskPath.Trim("\")
if (-not $trimmedTaskPath) {
    throw "TaskPath must name a Task Scheduler folder."
}
$TaskPath = "\" + $trimmedTaskPath + "\"
$updateScript = Join-Path $resolvedRepository "scripts\windows\update-cfbd-cache.ps1"
if (-not (Test-Path $updateScript)) {
    throw "The cache update script does not exist: $updateScript"
}

$timeZone = Get-TimeZone
if ($timeZone.Id -ne "Eastern Standard Time") {
    throw "The CFBD update host must use the Windows 'Eastern Standard Time' time zone. Current time zone: '$($timeZone.Id)'."
}

$scheduler = New-Object -ComObject "Schedule.Service"
$scheduler.Connect()
$currentFolder = $scheduler.GetFolder("\")
$currentPath = ""
foreach ($segment in $TaskPath.Trim("\").Split("\")) {
    $currentPath += "\$segment"
    try {
        $currentFolder = $scheduler.GetFolder($currentPath)
    }
    catch [Runtime.InteropServices.COMException] {
        $currentFolder = $currentFolder.CreateFolder($segment)
    }
}

$defaultUser = if ($env:USERDOMAIN) {
    "$env:USERDOMAIN\$env:USERNAME"
}
else {
    $env:USERNAME
}
$credential = Get-Credential `
    -UserName $defaultUser `
    -Message "Enter the Windows account that should run the Gridiron Curve cache update while logged out."
if (-not $credential) {
    throw "Windows credentials are required to register the scheduled task."
}

$powerShellExecutable = (Get-Process -Id $PID).Path
$actionArguments = @(
    "-NoLogo"
    "-NoProfile"
    "-NonInteractive"
    "-ExecutionPolicy Bypass"
    "-File `"$updateScript`""
    "-RepositoryRoot `"$resolvedRepository`""
) -join " "
$action = New-ScheduledTaskAction `
    -Execute $powerShellExecutable `
    -Argument $actionArguments `
    -WorkingDirectory $resolvedRepository

$triggers = @(
    New-ScheduledTaskTrigger -Daily -At "1:00 AM"
    New-ScheduledTaskTrigger -Daily -At "6:00 AM"
    New-ScheduledTaskTrigger -Daily -At "3:00 PM"
    New-ScheduledTaskTrigger -Daily -At "4:00 PM"
    New-ScheduledTaskTrigger -Daily -At "8:00 PM"
    New-ScheduledTaskTrigger -Daily -At "11:59 PM"
)
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -RestartCount 2 `
    -RestartInterval (New-TimeSpan -Minutes 15) `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries

$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
    $credential.Password
)
try {
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
        $passwordPointer
    )
    Register-ScheduledTask `
        -TaskName $TaskName `
        -TaskPath $TaskPath `
        -Action $action `
        -Trigger $triggers `
        -Settings $settings `
        -Description "Refreshes completed CFBD data and uploads the versioned cache to Azure Blob Storage." `
        -User $credential.UserName `
        -Password $password `
        -Force | Out-Null
}
finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    Remove-Variable password -ErrorAction SilentlyContinue
}

if ($TaskPath -ne "\") {
    $legacyTask = Get-ScheduledTask `
        -TaskName $TaskName `
        -TaskPath "\" `
        -ErrorAction SilentlyContinue
    if ($legacyTask) {
        Unregister-ScheduledTask `
            -TaskName $TaskName `
            -TaskPath "\" `
            -Confirm:$false
        Write-Host "Removed the previous root-level task '\$TaskName'."
    }
}

$task = Get-ScheduledTask -TaskName $TaskName -TaskPath $TaskPath
Write-Host "Registered scheduled task '$TaskPath$TaskName' with automatic season selection."
Write-Host "Run account: $($task.Principal.UserId)"
Write-Host "Schedule: Daily at 1 AM, 6 AM, 3 PM, 4 PM, 8 PM, and 11:59 PM Eastern."
