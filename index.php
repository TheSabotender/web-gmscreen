<?php
require_once __DIR__ . '/partials/config.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <?php include __DIR__ . '/partials/header.php'; ?>
</head>
<body>
  <?php include __DIR__ . '/partials/desktop.php'; ?>
  <?php include __DIR__ . '/partials/settings-modal.php'; ?>

  <script>
    // Expose premade panels to JS
    window.PREMADE_PANELS = <?php echo json_encode($panels, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?>;
  </script>
  <script type="module" src="assets/main.js"></script>
</body>
</html>