# ============================================================
# AI Frontier Daily — 封面图生成脚本
# 输出: assets/cover.png (1280x720)
# ============================================================

Add-Type -AssemblyName System.Drawing

$width  = 1280
$height = 720
$output = "assets\cover.png"

# 确保目录存在
$outDir = Split-Path $output -Parent
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }

$bmp  = New-Object System.Drawing.Bitmap($width, $height)
$g    = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode      = "AntiAlias"
$g.TextRenderingHint  = "AntiAlias"
$g.InterpolationMode  = "HighQualityBicubic"

Write-Host "Drawing background gradient..."

# ── 1. 绘制渐变背景 (深蓝紫 → 近黑) ──
for ($y = 0; $y -lt $height; $y++) {
    $t = $y / $height
    $r = [int](11  + $t * (26 - 11))
    $gv = [int](14 + $t * (16 - 14))
    $b = [int](26  + $t * (64 - 26))
    $color = [System.Drawing.Color]::FromArgb(255, $r, $gv, $b)
    $pen = New-Object System.Drawing.Pen($color, 1)
    $g.DrawLine($pen, 0, $y, $width, $y)
    $pen.Dispose()
}

Write-Host "Drawing glow effect..."

# ── 2. 绘制光晕效果 ──
$cx = 500; $cy = 360; $glowRadius = 600
for ($r = $glowRadius; $r -gt 0; $r -= 4) {
    $alpha = [int](15 * (1 - ($r / $glowRadius)))
    if ($alpha -lt 1) { break }
    $brush = New-Object System.Drawing.SolidBrush(
        [System.Drawing.Color]::FromArgb($alpha, 100, 160, 255)
    )
    $g.FillEllipse($brush, $cx - $r, $cy - $r, $r * 2, $r * 2)
    $brush.Dispose()
}

Write-Host "Drawing decorative lines..."

# ── 3. 装饰线条 ──
$lineColor = [System.Drawing.Color]::FromArgb(40, 120, 200, 255)
$linePen = New-Object System.Drawing.Pen($lineColor, 1.5)

# 使用数组的数组 - powershell 兼容写法
$lineData = New-Object 'int[][]' 6
$lineData[0] = @(800, 80, 1100, 60)
$lineData[1] = @(850, 140, 1200, 100)
$lineData[2] = @(780, 200, 1150, 150)
$lineData[3] = @(900, 100, 1250, 80)
$lineData[4] = @(820, 260, 1100, 210)
$lineData[5] = @(950, 50, 1260, 40)

for ($i = 0; $i -lt $lineData.Length; $i++) {
    $l = $lineData[$i]
    $g.DrawLine($linePen, $l[0], $l[1], $l[2], $l[3])
}
$linePen.Dispose()

Write-Host "Drawing dots..."

# ── 4. 散落小圆点 ──
$dotColor = [System.Drawing.Color]::FromArgb(60, 150, 210, 255)
$dotBrush = New-Object System.Drawing.SolidBrush($dotColor)

$dotData = New-Object 'int[][]' 11
$dotData[0]  = @(750, 300, 3)
$dotData[1]  = @(780, 320, 2)
$dotData[2]  = @(720, 350, 4)
$dotData[3]  = @(810, 380, 2)
$dotData[4]  = @(690, 500, 3)
$dotData[5]  = @(740, 480, 2)
$dotData[6]  = @(770, 550, 3)
$dotData[7]  = @(710, 600, 2)
$dotData[8]  = @(680, 420, 2)
$dotData[9]  = @(800, 440, 3)
$dotData[10] = @(760, 620, 2)

for ($i = 0; $i -lt $dotData.Length; $i++) {
    $d = $dotData[$i]
    $r = $d[2]
    $g.FillEllipse($dotBrush, $d[0] - $r, $d[1] - $r, $r * 2, $r * 2)
}
$dotBrush.Dispose()

Write-Host "Drawing neural network nodes..."

# ── 5. 神经网络节点 ──
$nodeColor = [System.Drawing.Color]::FromArgb(80, 100, 200, 255)
$nodeBrush = New-Object System.Drawing.SolidBrush($nodeColor)
$linkColor = [System.Drawing.Color]::FromArgb(30, 130, 200, 255)
$nodePen = New-Object System.Drawing.Pen($linkColor, 1)

$nodeData = New-Object 'int[][]' 15
$nodeData[0]  = @(900, 500)
$nodeData[1]  = @(950, 480)
$nodeData[2]  = @(920, 550)
$nodeData[3]  = @(980, 520)
$nodeData[4]  = @(960, 580)
$nodeData[5]  = @(1020, 490)
$nodeData[6]  = @(1050, 530)
$nodeData[7]  = @(1000, 560)
$nodeData[8]  = @(1080, 510)
$nodeData[9]  = @(1040, 590)
$nodeData[10] = @(1120, 540)
$nodeData[11] = @(1100, 600)
$nodeData[12] = @(1160, 560)
$nodeData[13] = @(1140, 620)
$nodeData[14] = @(1180, 590)

# 连线
for ($i = 0; $i -lt $nodeData.Length; $i++) {
    for ($j = $i + 1; $j -lt $nodeData.Length; $j++) {
        $dx = $nodeData[$i][0] - $nodeData[$j][0]
        $dy = $nodeData[$i][1] - $nodeData[$j][1]
        $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)
        if ($dist -gt 20 -and $dist -lt 100) {
            $g.DrawLine($nodePen, $nodeData[$i][0], $nodeData[$i][1], $nodeData[$j][0], $nodeData[$j][1])
        }
    }
}
# 节点
for ($i = 0; $i -lt $nodeData.Length; $i++) {
    $nr = 3
    $g.FillEllipse($nodeBrush, $nodeData[$i][0] - $nr, $nodeData[$i][1] - $nr, $nr * 2, $nr * 2)
}
$nodePen.Dispose()
$nodeBrush.Dispose()

Write-Host "Drawing title..."

# ── 6. 主标题（两行，更易读） ──
$titleFont  = New-Object System.Drawing.Font("Segoe UI", 72, [System.Drawing.FontStyle]::Bold)
$titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

# 文字阴影
$shadowBrush = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(40, 0, 0, 0)
)

# 第一行：AI FRONTIER
$g.DrawString("AI FRONTIER", $titleFont, $shadowBrush, 82, 122)
$g.DrawString("AI FRONTIER", $titleFont, $titleBrush, 80, 120)

# "FRONTIER" 高亮
$aiWidth = $g.MeasureString("AI ", $titleFont).Width
$highlightBrush = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(255, 100, 200, 255)
)
$g.DrawString("FRONTIER", $titleFont, $highlightBrush, 80 + $aiWidth, 120)

# 第二行：DAILY
$g.DrawString("DAILY", $titleFont, $shadowBrush, 82, 202)
$g.DrawString("DAILY", $titleFont, $titleBrush, 80, 200)

Write-Host "Drawing subtitle..."

# ── 7. 副标题 ──
$subFont  = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Regular)
$subBrush = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(200, 200, 210, 230)
)
$g.DrawString("6 sources  ·  1 AI editor  ·  0 noise.  Your daily AI briefing.", $subFont, $subBrush, 85, 295)

Write-Host "Drawing tag badges..."

# ── 8. 底部特性标签 ──
$tagFont  = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Regular)
$tagBrush = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(200, 180, 195, 215)
)

$tags = @("6 Premium Sources", "AI-Curated Filtering", "Bilingual ZH/EN", "One Email Daily")
$xPos = 85

foreach ($tag in $tags) {
    $tagBack = New-Object System.Drawing.SolidBrush(
        [System.Drawing.Color]::FromArgb(25, 255, 255, 255)
    )
    $tagSize = $g.MeasureString($tag, $tagFont)
    $tagW = $tagSize.Width + 24
    $tagH = $tagSize.Height + 12
    $g.FillRectangle($tagBack, $xPos, 380, $tagW, $tagH)
    $g.DrawString($tag, $tagFont, $tagBrush, $xPos + 12, 386)
    $tagBack.Dispose()
    $xPos += $tagW + 14
}

Write-Host "Drawing accent line..."

# ── 9. 顶部分隔线 ──
$accentColor = [System.Drawing.Color]::FromArgb(150, 100, 200, 255)
$accentPen = New-Object System.Drawing.Pen($accentColor, 2)
$g.DrawLine($accentPen, 80, 130, 300, 130)
$g.DrawLine($accentPen, 80, 130, 80, 140)
$accentPen.Dispose()

Write-Host "Drawing footer..."

# ── 10. 底部署名 ──
$footerFont  = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Regular)
$footerBrush = New-Object System.Drawing.SolidBrush(
    [System.Drawing.Color]::FromArgb(120, 150, 165, 190)
)
$g.DrawString("scoutai.cc  ·  $7.99 lifetime", $footerFont, $footerBrush, 85, 650)

# ── 保存 ──
Write-Host "Saving PNG..."
$bmp.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)

# 清理
$titleFont.Dispose(); $titleBrush.Dispose(); $shadowBrush.Dispose()
$highlightBrush.Dispose()
$subFont.Dispose(); $subBrush.Dispose()
$tagFont.Dispose(); $tagBrush.Dispose()
$footerFont.Dispose(); $footerBrush.Dispose()
$g.Dispose(); $bmp.Dispose()

Write-Host ""
Write-Host "============================================"
Write-Host " DONE - Cover image saved to: $output"
Write-Host " Size: ${width}x${height}"
Write-Host "============================================"
