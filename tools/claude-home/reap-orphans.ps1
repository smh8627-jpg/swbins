# Orphan reaper for Claude Code dev helpers (statusline/hooks/serena/headless chrome).
# Kills a process tree ONLY when its root's parent is dead (or the PID was reused
# by a newer process) AND the root is a KNOWN helper. Never kills user
# servers: a tree that contains a non-helper node.exe, Unity or Godot is kept.
# A bare "bash with a dead parent" is NOT a helper: Claude Code background tasks
# (run_in_background) look exactly like that while still working - only bash/git
# whose command line names a short-lived helper (statusline, rtk hook, ...) count.
# Installed to ~/.claude by install.js; launched by reap-orphans.js from the
# SessionStart / Stop hooks. ASCII only (Windows PowerShell 5.1 reads it as ANSI).
# -DryRun: print what would happen, kill nothing, write no files
param([int]$MinAgeMinutes = 2, [switch]$DryRun)

$ErrorActionPreference = 'SilentlyContinue'
$log = Join-Path $PSScriptRoot 'reap-orphans.log'
$now = Get-Date

$all = @(Get-CimInstance Win32_Process)
$byId = @{}
$kids = @{}
foreach ($p in $all) {
  $byId[[int]$p.ProcessId] = $p
  $pp = [int]$p.ParentProcessId
  if (-not $kids.ContainsKey($pp)) { $kids[$pp] = New-Object System.Collections.ArrayList }
  [void]$kids[$pp].Add($p)
}

$helperRe = '\\\.claude\\|/\.claude/|shell-snapshots|serena|language_servers|uv\\cache|statusline'
# lives a few seconds when healthy: statusline render, hook commands, prompt git
$shortRe = 'statusline|rtk(\.exe)?"? hook|branch --show-current|reap-orphans'
# MCP servers: their root is a direct child of claude.exe, so dead parent = session gone
$mcpRe = 'serena|language_servers|uv\\cache'

function Test-Orphan($p) {
  $par = $byId[[int]$p.ParentProcessId]
  if (-not $par) { return $true }
  # PID reuse: a "parent" born after the child is not the real parent
  return ($par.CreationDate -gt $p.CreationDate)
}

# Git Bash (MSYS) creates a child SUSPENDED and resumes it once set up; if the bash
# is killed in between (Claude Code dropping a statusline render), the child stays
# suspended forever: 1 thread, no modules, never ran a line - its own exit timer
# cannot fire. Such a process has done nothing, so killing it loses nothing.
function Test-NeverStarted($p) {
  if ($p.Name.ToLower() -notin 'bash.exe','sh.exe','git.exe','node.exe','cmd.exe','rtk.exe','python.exe') { return $false }
  $gp = Get-Process -Id $p.ProcessId
  if (-not $gp -or -not $gp.Threads.Count) { return $false }
  foreach ($t in $gp.Threads) { if ([string]$t.WaitReason -ne 'Suspended') { return $false } }
  return $true
}

# returns the minimum age (minutes) before the orphan may be killed, or -1 = never
function Get-CandidateAge($p) {
  $n = $p.Name.ToLower()
  $c = [string]$p.CommandLine
  if ($c -match $shortRe -and $c -notmatch 'shell-snapshots' -and $n -in 'bash.exe','sh.exe','git.exe','node.exe','cmd.exe','rtk.exe') { return $MinAgeMinutes }
  if ($n -in 'uvx.exe','uv.exe','serena.exe','python.exe' -and $c -match $mcpRe) { return $MinAgeMinutes }
  if ($n -in 'node.exe','python.exe' -and $c -match '[\\/]\.claude[\\/]' -and $c -notmatch 'shell-snapshots') { return $MinAgeMinutes }
  # headless chrome belongs to a verification turn; give a slow probe plenty of room
  if ($n -eq 'chrome.exe' -and $c -match '--headless') { return [math]::Max($MinAgeMinutes, 30) }
  return -1
}

function Get-Tree($p) {
  $out = New-Object System.Collections.ArrayList
  $stack = New-Object System.Collections.Stack
  $stack.Push($p)
  while ($stack.Count) {
    $x = $stack.Pop(); [void]$out.Add($x)
    $ch = $kids[[int]$x.ProcessId]
    if ($ch) { foreach ($k in $ch) { if ($k.CreationDate -ge $x.CreationDate) { $stack.Push($k) } } }
  }
  return $out
}

function Test-Protected($p) {
  $n = $p.Name.ToLower()
  if ($n -eq 'node.exe' -and -not ([string]$p.CommandLine -match $helperRe)) { return $true }
  if ($n -like 'unity*' -or $n -like 'godot*') { return $true }
  return $false
}

$lines = @()
foreach ($p in $all) {
  $never = $false
  $minAge = Get-CandidateAge $p
  if ($minAge -lt 0) {
    if (-not (Test-Orphan $p)) { continue }
    if (-not (Test-NeverStarted $p)) { continue }
    $never = $true
    $minAge = $MinAgeMinutes
  } elseif (-not (Test-Orphan $p)) { continue }
  if (($now - $p.CreationDate).TotalMinutes -lt $minAge) { continue }
  $tree = @(Get-Tree $p)
  $cmd = ([string]$p.CommandLine) -replace '\s+', ' '
  if ($cmd.Length -gt 140) { $cmd = $cmd.Substring(0, 140) }
  # a never-started process cannot be a user server, whatever its name
  $keep = if ($never) { @() } else { @($tree | Where-Object { Test-Protected $_ }) }
  if ($keep.Count) {
    $lines += "{0:yyyy-MM-dd HH:mm} KEEP {1} {2} (holds {3}) :: {4}" -f $now, $p.Name, $p.ProcessId, (($keep | ForEach-Object { $_.Name }) -join ','), $cmd
    continue
  }
  # age + CPU seconds: tells a hung-idle helper (cpu ~0) from a spinning one next time
  $age = [int]($now - $p.CreationDate).TotalMinutes
  $cpu = [math]::Round(([double]$p.KernelModeTime + [double]$p.UserModeTime) / 1e7, 2)
  if (-not $DryRun) { & taskkill.exe /T /F /PID $p.ProcessId *> $null }
  $why = if ($never) { ' never-started' } else { '' }
  $lines += "{0:yyyy-MM-dd HH:mm} KILL {1} {2} tree={3} age={4}m cpu={5}s{6} :: {7}" -f $now, $p.Name, $p.ProcessId, $tree.Count, $age, $cpu, $why, $cmd
}

if ($DryRun) { if ($lines.Count) { $lines } else { 'nothing to do' }; return }
if ($lines.Count) {
  if ((Test-Path $log) -and (Get-Item $log).Length -gt 256KB) {
    $tail = Get-Content $log -Tail 500
    Set-Content -Path $log -Value $tail -Encoding UTF8
  }
  Add-Content -Path $log -Value $lines -Encoding UTF8
}
# proof of life: overwritten every run, so "did the hook actually run?" is one look
Set-Content -Path (Join-Path $PSScriptRoot 'reap-orphans.last') -Value ("{0:yyyy-MM-dd HH:mm:ss} scanned={1} acted={2}" -f $now, $all.Count, $lines.Count) -Encoding ASCII
