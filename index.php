<?php
require_once __DIR__ . '/partials/config.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <?php include __DIR__ . '/partials/header.php'; ?>
  <script src="https://cdn.jsdelivr.net/npm/jquery"></script>
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
        "cannon-es": "./cannon-es/cannon-es.js"
      }
    }
  </script>
  <?php include __DIR__ . '/partials/desktop.php'; ?>
  <?php include __DIR__ . '/partials/settings-modal.php'; ?>

  <!-- "https://unpkg.com/three@0.160.0/build/three.module.js" -->
  
  <script>
    // Expose premade panels to JS
    window.PREMADE_PANELS = <?php echo json_encode($panels, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;
  </script>
  <script type="module" src="scripts/main.js"></script>
</body>
</html>