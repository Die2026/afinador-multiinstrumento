$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8000/")
$listener.Start()
Write-Host "Servidor web activo en http://localhost:8000/"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response
    
    $localPath = $req.Url.LocalPath.TrimStart('/')
    if ([string]::IsNullOrEmpty($localPath)) {
        $localPath = "index.html"
    }
    
    $filePath = Join-Path "C:\Users\Diego\.gemini\antigravity\scratch\instrument-tuner" $localPath
    
    if (-not (Test-Path $filePath) -or (Test-Path $filePath -PathType Container)) {
        $filePath = Join-Path $filePath "index.html"
    }
    
    if (Test-Path $filePath) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        
        switch ($ext) {
            ".html" { $res.ContentType = "text/html; charset=utf-8" }
            ".css"  { $res.ContentType = "text/css; charset=utf-8" }
            ".js"   { $res.ContentType = "text/javascript; charset=utf-8" }
            ".json" { $res.ContentType = "application/json; charset=utf-8" }
            ".svg"  { $res.ContentType = "image/svg+xml" }
            default { $res.ContentType = "application/octet-stream" }
        }
        
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $res.StatusCode = 404
    }
    $res.OutputStream.Close()
}
