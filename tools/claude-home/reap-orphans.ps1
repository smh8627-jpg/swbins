# Orphan reaper for Claude Code dev helpers (bash/git/serena/headless chrome ...).
# Kills a process tree ONLY when its root's parent is dead (or the PID was reused
# by a newer process) AND the root looks like a Claude helper. Never kills user
# servers: a tree that contains a non-helper node.exe, Unity or Godot is kept.
# Installed to ~/.claude by install.js; launched by reap-orphans.js from the
# SessionStart / Stop hooks. ASCII only (Windows PowerShell 5.1 reads it as ANSI).
param([int]$MinAgeMinutes = 2)

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

function Test-Orphan($p) {
  $par = $byId[[int]$p.ParentProcessId]
  if (-not $par) { return $true }
  # PID reuse: a "parent" born after the child is not the real parent
  return ($par.CreationDate -gt $p.CreationDate)
}

function Test-Candidate($p) {
  $n = $p.Name.ToLower()
  $c = [string]$p.CommandLine
  if ($n -in 'bash.exe','sh.exe','git.exe','uvx.exe','uv.exe','serena.exe','rtk.exe') { return $true }
  if ($n -in 'python.exe','node.exe','cmd.exe') { return ($c -match $helperRe) }
  if ($n -eq 'chrome.exe') { return ($c -match '--headless') }
  return $false
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
  if (-not (Test-Candidate $p)) { continue }
  if (-not (Test-Orphan $p)) { continue }
  if (($now - $p.CreationDate).TotalMinutes -lt $MinAgeMinutes) { continue }
  $tree = Get-Tree $p
  $cmd = ([string]$p.CommandLine) -replace '\s+', ' '
  if ($cmd.Length -gt 140) { $cmd = $cmd.Substring(0, 140) }
  $keep = @($tree | Where-Object { Test-Protected $_ })
  if ($keep.Count) {
    $lines += "{0:yyyy-MM-dd HH:mm} KEEP {1} {2} (holds {3}) :: {4}" -f $now, $p.Name, $p.ProcessId, (($keep | ForEach-Object { $_.Name }) -join ','), $cmd
    continue
  }
  & taskkill.exe /T /F /PID $p.ProcessId *> $null
  $lines += "{0:yyyy-MM-dd HH:mm} KILL {1} {2} tree={3} :: {4}" -f $now, $p.Name, $p.ProcessId, $tree.Count, $cmd
}

if ($lines.Count) {
  if ((Test-Path $log) -and (Get-Item $log).Length -gt 256KB) {
    $tail = Get-Content $log -Tail 500
    Set-Content -Path $log -Value $tail -Encoding UTF8
  }
  Add-Content -Path $log -Value $lines -Encoding UTF8
}
