#requires -Version 7.0
[CmdletBinding()]
param([ValidateSet('Create','Inspect','Remove')][string]$Action='Inspect')
$ErrorActionPreference='Stop'
$taskName='banuchat-auth-p21-20261022'
$taskNetwork="$taskName-isolated"
$taskVolume="$taskName-data"
$taskLabel='BCH04-AUTH-P2.1'
$taskState=Join-Path $PSScriptRoot 'local/auth-p21'
$taskCredentials=Join-Path $taskState 'environment.json'
$taskRecord=Join-Path $taskState 'resources.json'
function Invoke-TaskDocker([string[]]$DockerArgs) {
    $output=& docker @DockerArgs
    if($LASTEXITCODE -ne 0){throw 'AUTH-P2.1 Docker operation failed; inspect exact task resources before cleanup'}
    return $output
}
if($Action -eq 'Create') {
    if(@(Invoke-TaskDocker @('ps','-a','--format','{{.Names}}')) -contains $taskName -or
       @(Invoke-TaskDocker @('network','ls','--format','{{.Name}}')) -contains $taskNetwork -or
       @(Invoke-TaskDocker @('volume','ls','--format','{{.Name}}')) -contains $taskVolume){throw 'Task resource already exists; no implicit reuse'}
    if(Get-NetTCPConnection -State Listen -LocalPort 55437 -ErrorAction SilentlyContinue){throw 'Task port occupied'}
    $image=(Invoke-TaskDocker @('image','inspect','--format','{{.Id}}','pgvector/pgvector:pg16')).Trim()
    New-Item -ItemType Directory -Force -Path $taskState | Out-Null
    $configuration=@{container=$taskName;network=$taskNetwork;volume=$taskVolume;host='127.0.0.1';port=55437;
      deploymentId=[guid]::NewGuid().ToString();rateKey=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32));
      database='banuchat_auth_p21_test';adminUser='auth_p21_migrator';runtimeUser='auth_p21_runtime';
      adminPassword=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32));
      runtimePassword=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))}
    [IO.File]::WriteAllText($taskCredentials,($configuration|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
    $networkId=(Invoke-TaskDocker @('network','create','--driver','bridge','--opt','com.docker.network.bridge.enable_ip_masquerade=false',
      '--label',"banuchat.task=$taskLabel",$taskNetwork)).Trim()
    $null=Invoke-TaskDocker @('volume','create','--label',"banuchat.task=$taskLabel",$taskVolume)
    $volume=(Invoke-TaskDocker @('volume','inspect',$taskVolume)|ConvertFrom-Json)[0]
    $record=@{name=$taskName;network=$taskNetwork;networkId=$networkId;volume=$taskVolume;volumeCreatedAt=$volume.CreatedAt;
      volumeMountpoint=$volume.Mountpoint;containerId=$null;image=$image}
    [IO.File]::WriteAllText($taskRecord,($record|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
    $saved=@{};foreach($key in @('POSTGRES_USER','POSTGRES_DB','POSTGRES_PASSWORD')){$saved[$key]=[Environment]::GetEnvironmentVariable($key,'Process')}
    try {
        $env:POSTGRES_USER=$configuration.adminUser;$env:POSTGRES_DB=$configuration.database;$env:POSTGRES_PASSWORD=$configuration.adminPassword
        $record.containerId=(Invoke-TaskDocker @('run','--detach','--pull','never','--name',$taskName,
          '--label',"banuchat.task=$taskLabel",'--network',$taskNetwork,'--publish','127.0.0.1:55437:5432',
          '--mount',"type=volume,src=$taskVolume,dst=/var/lib/postgresql/data",
          '--env','POSTGRES_USER','--env','POSTGRES_DB','--env','POSTGRES_PASSWORD',$image)).Trim()
        [IO.File]::WriteAllText($taskRecord,($record|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
    }finally {foreach($key in $saved.Keys){[Environment]::SetEnvironmentVariable($key,$saved[$key],'Process')}}
    Write-Output 'Created exclusively AUTH-P2.1 PostgreSQL, independent named volume/network, loopback 55437.'
    exit
}
if(-not(Test-Path -LiteralPath $taskRecord)){throw 'Missing exact resource record'}
$record=Get-Content -LiteralPath $taskRecord -Raw|ConvertFrom-Json
if($record.name -ne $taskName -or $record.network -ne $taskNetwork -or $record.volume -ne $taskVolume){throw 'Record mismatch'}
$container=(Invoke-TaskDocker @('inspect',$taskName)|ConvertFrom-Json)[0]
$network=(Invoke-TaskDocker @('network','inspect',$taskNetwork)|ConvertFrom-Json)[0]
$volume=(Invoke-TaskDocker @('volume','inspect',$taskVolume)|ConvertFrom-Json)[0]
$binding=$container.HostConfig.PortBindings.'5432/tcp'
$mounts=@($container.Mounts)
$members=@($network.Containers.PSObject.Properties)
if($container.Id -ne $record.containerId -or $network.Id -ne $record.networkId -or
   $container.Config.Labels.'banuchat.task' -ne $taskLabel -or $network.Labels.'banuchat.task' -ne $taskLabel -or
   $volume.Labels.'banuchat.task' -ne $taskLabel -or $volume.CreatedAt -ne $record.volumeCreatedAt -or
   $volume.Mountpoint -ne $record.volumeMountpoint -or $mounts.Count -ne 1 -or $mounts[0].Type -ne 'volume' -or
   $mounts[0].Name -ne $taskVolume -or $mounts[0].Destination -ne '/var/lib/postgresql/data' -or
   $binding.Count -ne 1 -or $binding[0].HostIp -ne '127.0.0.1' -or $binding[0].HostPort -ne '55437' -or
   $members.Count -ne 1 -or $members[0].Name -ne $container.Id){throw 'Task ownership/isolation mismatch; refuse mutation'}
if($Action -eq 'Inspect') {
    [pscustomobject]@{container=$taskName;containerId=$container.Id;networkId=$network.Id;volume=$taskVolume;
      image=$container.Image;port='127.0.0.1:55437';independentVolume=$true;independentNetwork=$true}
    exit
}
# Docker removes only the exact verified task objects, never host directories or existing volumes.
$null=Invoke-TaskDocker @('rm','--force',$container.Id)
$null=Invoke-TaskDocker @('network','rm',$network.Id)
$null=Invoke-TaskDocker @('volume','rm',$taskVolume)
$resolvedCredentials=[IO.Path]::GetFullPath($taskCredentials)
$resolvedState=[IO.Path]::GetFullPath($taskState)+[IO.Path]::DirectorySeparatorChar
if(-not $resolvedCredentials.StartsWith($resolvedState,[StringComparison]::OrdinalIgnoreCase)){throw 'Credentials outside task directory'}
if(Test-Path -LiteralPath $resolvedCredentials){Remove-Item -LiteralPath $resolvedCredentials}
$record|Add-Member -NotePropertyName removed -NotePropertyValue $true -Force
[IO.File]::WriteAllText($taskRecord,($record|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
Write-Output 'Removed only verified AUTH-P2.1 container/network/volume and its generated credentials.'
