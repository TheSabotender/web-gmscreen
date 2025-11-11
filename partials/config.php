<?php
// partials/config.php
$panelsJsonPath = __DIR__ . '/../panels.json';
$panels = [];

if (file_exists($panelsJsonPath)) {
    $json = file_get_contents($panelsJsonPath);
    $decoded = json_decode($json, true);
    if (is_array($decoded)) {
        $panels = $decoded;
    }
}