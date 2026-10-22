param([Parameter(Mandatory=$true)][string]$OutputPath,[Parameter(Mandatory=$true)][string]$StopFile,[int]$MaxSamples=600)
# Read-only telemetry; no process termination, priority or GPU configuration changes.
if (Test-Path -LiteralPath $OutputPath) { throw 'Telemetry output already exists' }
for ($sample=0; $sample -lt $MaxSamples; $sample++) {
  if (Test-Path -LiteralPath $StopFile) { break }
  $row=[ordered]@{utc=[DateTime]::UtcNow.ToString('o');sample=$sample}
  try { $row.cpu_percent=(Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'" -ErrorAction Stop).PercentProcessorTime } catch { $row.cpu_percent=$null; $row.cpu_unavailable=$true }
  try { $mem=Get-CimInstance Win32_OperatingSystem -ErrorAction Stop; $row.ram_total_kib=$mem.TotalVisibleMemorySize; $row.ram_free_kib=$mem.FreePhysicalMemory } catch { $row.ram_unavailable=$true }
  try {
    $gpu=@(& nvidia-smi --query-gpu=name,memory.total,memory.used,utilization.gpu,utilization.memory --format=csv,noheader,nounits 2>$null)
    if ($LASTEXITCODE -ne 0) { throw 'GPU unavailable' }
    $row.gpus=@($gpu | ForEach-Object { $v=$_ -split ',\s*'; [ordered]@{name=$v[0];vram_total_mib=$v[1];vram_used_mib=$v[2];gpu_percent=$v[3];memory_utilization_percent=$v[4]} })
  } catch { $row.gpu_unavailable=$true }
  $row | ConvertTo-Json -Depth 4 -Compress | Add-Content -LiteralPath $OutputPath -Encoding utf8
  Start-Sleep -Seconds 2
}
Write-Output "Telemetry finished: $sample samples."
