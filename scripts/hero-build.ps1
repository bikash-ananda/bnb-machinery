# Put your photos in hero-source\<page>\ (any size, any name). Run this script.
# It resizes them (max 1920px, JPEG 80%) into public\images\hero\<page>\ and rebuilds data\heroImages.generated.ts.
# Your originals are never changed. The file name becomes the photo description, so name files clearly,
# e.g. power-tiller-ploughing-terrace-field.jpg
Add-Type -AssemblyName System.Drawing
$keys = 'home','about','products','services','brands','gallery','contact','location'
$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]80)
$lines = @('// Rebuilt by scripts/hero-build.ps1. Do not edit by hand.', 'export const generated: Record<string, { src: string; alt: string }[]> = {')

foreach ($k in $keys) {
  $src = Join-Path 'hero-source' $k
  $dst = Join-Path 'public/images/hero' $k
  New-Item -ItemType Directory -Force -Path $src, $dst | Out-Null
  Get-ChildItem $src -File | Where-Object { $_.Extension -match '^\.(jpe?g|png|webp)$' } | ForEach-Object {
    $name = ($_.BaseName.ToLower() -replace '[^a-z0-9]+', '-').Trim('-')
    $target = Join-Path $dst ($name + '.jpg')
    if (-not (Test-Path $target) -or $_.LastWriteTime -gt (Get-Item $target).LastWriteTime) {
      $img = [System.Drawing.Image]::FromFile($_.FullName)
      try {
        if ($img.PropertyIdList -contains 0x0112) {
          switch ($img.GetPropertyItem(0x0112).Value[0]) {
            3 { $img.RotateFlip('Rotate180FlipNone') }
            6 { $img.RotateFlip('Rotate90FlipNone') }
            8 { $img.RotateFlip('Rotate270FlipNone') }
          }
        }
        $scale = [Math]::Min(1, 1920 / [Math]::Max($img.Width, $img.Height))
        $w = [int]($img.Width * $scale); $h = [int]($img.Height * $scale)
        $bmp = New-Object System.Drawing.Bitmap $w, $h
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = 'HighQualityBicubic'
        $g.DrawImage($img, 0, 0, $w, $h)
        $g.Dispose()
        $bmp.Save($target, $jpeg, $ep)
        $bmp.Dispose()
      } finally { $img.Dispose() }
    }
  }
  $lines += "  `"$k`": ["
  Get-ChildItem $dst -Filter *.jpg | Sort-Object Name | ForEach-Object {
    $alt = ($_.BaseName -replace '-', ' ').Trim()
    if ($alt.Length -gt 0) { $alt = $alt.Substring(0,1).ToUpper() + $alt.Substring(1) }
    $lines += "    { src: `"/images/hero/$k/$($_.Name)`", alt: `"$alt`" },"
  }
  $lines += '  ],'
}
$lines += '};'
[IO.File]::WriteAllLines((Join-Path (Get-Location) 'data/heroImages.generated.ts'), $lines, (New-Object Text.UTF8Encoding $false))
Write-Host 'Done. Photos per page:'
foreach ($k in $keys) { Write-Host ("  {0,-9} {1}" -f $k, (Get-ChildItem (Join-Path 'public/images/hero' $k) -Filter *.jpg).Count) }