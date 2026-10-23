#requires -Version 7.0
[CmdletBinding()]
param([ValidateSet('Create','Inspect','Remove')][string]$Action='Inspect')
$ErrorActionPreference='Stop'
$taskName='banuchat-auth-p1-20261022'
$taskNetwork='banuchat-auth-p1-20261022-isolated'
$taskLabel='BCH04-AUTH-P1'
$taskRoot=[System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskState=Join-Path $PSScriptRoot 'local/auth-p1'
$taskCredentials=Join-Path $taskState 'environment.json'
$taskRecord=Join-Path $taskState 'resources.json'
function Invoke-TaskDocker([string[]]$DockerArgs) {
    $output=& docker @DockerArgs
    if($LASTEXITCODE -ne 0){throw 'Docker task operation failed; existing resources are not cleaned automatically'}
    return $output
}
function Read-TaskContainer {
    $value=(Invoke-TaskDocker @('inspect',$taskName) | ConvertFrom-Json)[0]
    if($value.Config.Labels.'banuchat.task' -ne $taskLabel -or $value.Mounts.Count -ne 0 -or
       -not $value.HostConfig.Tmpfs.'/var/lib/postgresql/data') {throw 'Container is not an exclusively temporary AUTH-P1 resource'}
    $binding=$value.HostConfig.PortBindings.'5432/tcp'
    if($binding.Count -ne 1 -or $binding[0].HostIp -ne '127.0.0.1' -or $binding[0].HostPort -ne '55435'){throw 'Unexpected task port binding'}
    return $value
}
if($Action -eq 'Create') {
    if(@(Invoke-TaskDocker @('ps','-a','--format','{{.Names}}')) -contains $taskName -or
       @(Invoke-TaskDocker @('network','ls','--format','{{.Name}}')) -contains $taskNetwork){throw 'Task name already exists: inspect; do not reuse implicitly'}
    if(Get-NetTCPConnection -State Listen -LocalPort 55435 -ErrorAction SilentlyContinue){throw 'Port 55435 occupied'}
    $image=(Invoke-TaskDocker @('image','inspect','--format','{{.Id}}','pgvector/pgvector:pg16')).Trim()
    New-Item -ItemType Directory -Force -Path $taskState | Out-Null
    $configuration=@{container=$taskName;network=$taskNetwork;host='127.0.0.1';port=55435;database='banuchat_auth_p1_test';
      adminUser='auth_p1_migrator';adminPassword=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32));
      runtimeUser='auth_p1_runtime';runtimePassword=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32));
      provisionUser='auth_p1_provisioner';provisionPassword=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32));
      deploymentId=[guid]::NewGuid().ToString();rateKey=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))}
    [IO.File]::WriteAllText($taskCredentials,($configuration|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
    $networkId=(Invoke-TaskDocker @('network','create','--driver','bridge','--opt','com.docker.network.bridge.enable_ip_masquerade=false','--label',"banuchat.task=$taskLabel",$taskNetwork)).Trim()
    $record=@{name=$taskName;network=$taskNetwork;networkId=$networkId;containerId=$null;image=$image;deploymentId=$configuration.deploymentId}
    [IO.File]::WriteAllText($taskRecord,($record|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
    $saved=@{};foreach($key in @('POSTGRES_USER','POSTGRES_DB','POSTGRES_PASSWORD')){$saved[$key]=[Environment]::GetEnvironmentVariable($key,'Process')}
    try {
        $env:POSTGRES_USER=$configuration.adminUser;$env:POSTGRES_DB=$configuration.database;$env:POSTGRES_PASSWORD=$configuration.adminPassword
        $record.containerId=(Invoke-TaskDocker @('run','--detach','--pull','never','--name',$taskName,'--label',"banuchat.task=$taskLabel",'--label','banuchat.isolated=true',
          '--network',$taskNetwork,'--publish','127.0.0.1:55435:5432','--tmpfs','/var/lib/postgresql/data:rw,noexec,nosuid,size=256m',
          '--env','POSTGRES_USER','--env','POSTGRES_DB','--env','POSTGRES_PASSWORD',$image)).Trim()
        [IO.File]::WriteAllText($taskRecord,($record|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
    }finally {foreach($key in $saved.Keys){[Environment]::SetEnvironmentVariable($key,$saved[$key],'Process')}}
    $null=Read-TaskContainer
    Write-Output 'Created AUTH-P1-only PostgreSQL: loopback 55435, tmpfs 256 MiB, dedicated bridge without masquerade.'
    exit
}
if(-not(Test-Path -LiteralPath $taskRecord)){throw 'Missing resource identity record; inspect manually, never infer ownership from name alone'}
$record=Get-Content -LiteralPath $taskRecord -Raw|ConvertFrom-Json
if($record.name -ne $taskName -or $record.network -ne $taskNetwork){throw 'Resource record mismatch'}
$container=Read-TaskContainer
$network=(Invoke-TaskDocker @('network','inspect',$taskNetwork)|ConvertFrom-Json)[0]
if($container.Id -ne $record.containerId -or $network.Id -ne $record.networkId -or $network.Labels.'banuchat.task' -ne $taskLabel){throw 'Resource ID or label changed'}
$members=@($network.Containers.PSObject.Properties)
if($members.Count -ne 1 -or $members[0].Name -ne $container.Id){throw 'Task network has unexpected members; refuse cleanup'}
if($Action -eq 'Inspect') {
    [pscustomobject]@{container=$taskName;containerId=$container.Id;network=$taskNetwork;image=$container.Image;port='127.0.0.1:55435';tmpfs=$true;hostVolumes=$container.Mounts.Count}
    exit
}
# Only resources whose exact IDs and ownership were checked above. No volume deletion.
$null=Invoke-TaskDocker @('rm','--force',$container.Id)
$null=Invoke-TaskDocker @('network','rm',$network.Id)
$resolvedCredentials=[IO.Path]::GetFullPath($taskCredentials)
$resolvedState=[IO.Path]::GetFullPath($taskState)+[IO.Path]::DirectorySeparatorChar
if(-not $resolvedCredentials.StartsWith($resolvedState,[StringComparison]::OrdinalIgnoreCase)){throw 'Credential path escaped task directory'}
if(Test-Path -LiteralPath $resolvedCredentials){Remove-Item -LiteralPath $resolvedCredentials}
$record|Add-Member -NotePropertyName removed -NotePropertyValue $true -Force
[IO.File]::WriteAllText($taskRecord,($record|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
Write-Output 'Removed only verified AUTH-P1 container/network and its local credentials; no volumes or existing resources deleted.'
