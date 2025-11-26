<?php
require_once __DIR__ . '/partials/config.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Player View</title>
<link rel="stylesheet" href="assets/app.css">
<script src="https://cdn.jsdelivr.net/npm/marked/lib/marked.umd.js"></script>
</head>
<body> 

<script type="importmap">
    {
      "imports": {        
        "three": "./three/Three.js",
        "three/": "./three/",
        "dice-so-nice/module/": "./dice-so-nice/module/",
        "webworker-promise": "./webworker-promise/index.js",
        "webworker-promise/": "./webworker-promise/",
        "cannon-es": "./cannon-es/cannon-es.js",
        "marked": "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js"
      }
    }
  </script>
  
<div id="app-root" class="tabbar-bottom">
  <div id="wallpaper" class="wallpaper">
    <!-- Wallpaper will be injected here by JS -->
  </div>

  <div id="desktop" class="desktop" tabindex="0">
    <!-- Panels will be injected here by JS -->
  </div>
</div>

  <script>
    // Expose premade panels to JS
    window.PREMADE_PANELS = <?php echo json_encode($panels, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;
  </script>
  <script type="module" src="scripts/player.js"></script>
  
</body>
</html>