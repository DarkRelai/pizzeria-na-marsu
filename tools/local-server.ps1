$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add('http://127.0.0.1:8123/')

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
}

function Send-Response($context, [int]$status, [byte[]]$body, [string]$contentType) {
  $context.Response.StatusCode = $status
  $context.Response.ContentType = $contentType
  $context.Response.ContentLength64 = $body.Length
  $context.Response.OutputStream.Write($body, 0, $body.Length)
  $context.Response.Close()
}

try {
  $listener.Start()
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
      $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart('/'))
      if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
      $candidate = [IO.Path]::GetFullPath((Join-Path $root $relative))
      if (-not $candidate.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        $body = [Text.Encoding]::UTF8.GetBytes('Not Found')
        Send-Response $context 404 $body 'text/plain; charset=utf-8'
        continue
      }
      $extension = [IO.Path]::GetExtension($candidate).ToLowerInvariant()
      $contentType = if ($mime.ContainsKey($extension)) { $mime[$extension] } else { 'application/octet-stream' }
      Send-Response $context 200 ([IO.File]::ReadAllBytes($candidate)) $contentType
    } catch {
      try {
        $body = [Text.Encoding]::UTF8.GetBytes('Server error')
        Send-Response $context 500 $body 'text/plain; charset=utf-8'
      } catch {}
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
