param([switch]$Build)
$ErrorActionPreference = 'Stop'
$taskEnvironmentFile = Join-Path $PSScriptRoot '.env'
if (Test-Path -LiteralPath $taskEnvironmentFile) {
    foreach ($taskEnvironmentLine in Get-Content -LiteralPath $taskEnvironmentFile -Encoding UTF8) {
        if ($taskEnvironmentLine.Trim().StartsWith('#') -or [string]::IsNullOrWhiteSpace($taskEnvironmentLine)) { continue }
        if ($taskEnvironmentLine -notmatch '^\s*([A-Z][A-Z0-9_]*)\s*=(.*)$') { throw 'Invalid .env entry; use NAME=value.' }
        $taskEnvironmentName = $Matches[1]
        $taskEnvironmentValue = $Matches[2].Trim()
        if ($taskEnvironmentValue.Length -ge 2 -and (($taskEnvironmentValue.StartsWith('"') -and $taskEnvironmentValue.EndsWith('"')) -or ($taskEnvironmentValue.StartsWith("'") -and $taskEnvironmentValue.EndsWith("'")))) {
            $taskEnvironmentValue = $taskEnvironmentValue.Substring(1, $taskEnvironmentValue.Length - 2)
        }
        [System.Environment]::SetEnvironmentVariable($taskEnvironmentName, $taskEnvironmentValue, 'Process')
    }
}
Push-Location -LiteralPath $PSScriptRoot
try {
    if ($Build) { & .\gradlew.bat bootJar } else { & .\gradlew.bat bootRun }
    if ($LASTEXITCODE -ne 0) { throw 'Backend command failed.' }
} finally { Pop-Location }
