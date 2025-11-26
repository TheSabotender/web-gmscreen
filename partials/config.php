<?php
// partials/config.php
$panelsDir = __DIR__ . '/../panels';
$panels = [];

function parsePanelMeta(string $html): array
{
    $meta = [];

    if (preg_match_all('/<meta\s+([^>]+?)\s*\/?>/i', $html, $matches)) {
        foreach ($matches[1] as $attrString) {
            if (preg_match_all('/(\w+)="([^"]*)"/', $attrString, $attrMatches, PREG_SET_ORDER)) {
                foreach ($attrMatches as $attr) {
                    $meta[strtolower($attr[1])] = $attr[2];
                }
            }
        }
    }

    return $meta;
}

function buildPanelDefinition(string $filePath, string $basePath): ?array
{
    $content = file_get_contents($filePath);
    if ($content === false) {
        return null;
    }

    $meta = parsePanelMeta($content);
    if (!isset($meta['panelid'])) {
        return null;
    }

    $relativePath = ltrim(str_replace($basePath, '', $filePath), DIRECTORY_SEPARATOR);
    $relativePath = str_replace('\\', '/', $relativePath);

    $folderPath = trim(str_replace('\\', '/', dirname($relativePath)), '/');
    $folders = $folderPath ? explode('/', $folderPath) : [];

    $width = isset($meta['panelwidth']) && is_numeric($meta['panelwidth'])
        ? (int) $meta['panelwidth']
        : null;
    $height = isset($meta['panelheight']) && is_numeric($meta['panelheight'])
        ? (int) $meta['panelheight']
        : null;

    return [
        'id' => $meta['panelid'],
        'name' => $meta['displayname'] ?? pathinfo($filePath, PATHINFO_FILENAME),
        'file' => 'panels/' . $relativePath,
        'source' => $meta['readmoreurl'] ?? null,
        'width' => $width,
        'height' => $height,
        'folders' => $folders
    ];
}

if (is_dir($panelsDir)) {
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($panelsDir, FilesystemIterator::SKIP_DOTS)
    );

    foreach ($iterator as $fileInfo) {
        if (!$fileInfo->isFile() || strtolower($fileInfo->getExtension()) !== 'html') {
            continue;
        }

        $panel = buildPanelDefinition($fileInfo->getPathname(), rtrim($panelsDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR);
        if ($panel) {
            $panels[] = $panel;
        }
    }

    usort($panels, function ($a, $b) {
        $aPath = implode('/', $a['folders'] ?? []) . '/' . ($a['name'] ?? '');
        $bPath = implode('/', $b['folders'] ?? []) . '/' . ($b['name'] ?? '');
        return strcasecmp($aPath, $bPath);
    });
}
