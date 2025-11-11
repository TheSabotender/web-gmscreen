<?php
// partials/desktop.php
?>
<div id="app-root" class="tabbar-bottom">
  <div id="desktop" class="desktop" tabindex="0">
    <!-- Panels will be injected here by JS -->
  </div>

  <!-- Tab bar -->
  <div id="tab-bar" class="tab-bar">
    <div id="tab-list" class="tab-list">
      <!-- Tabs injected by JS -->
    </div>
    <button id="add-tab-btn" class="tab-add-btn" title="New Tab">+</button>
  </div>
</div>

<!-- Desktop context menu -->
<div id="desktop-context-menu" class="context-menu">
  <ul>
    <li class="context-item" data-action="add-premade">Add Premade Panel ▸
      <ul class="context-submenu" id="premade-panel-submenu">
        <!-- Premade list injected from PHP/JS -->
      </ul>
    </li>
    <li class="context-item" data-action="add-custom">Add Custom Panel</li>
    <li class="context-item" data-action="add-external">Add External Panel</li>
    <li class="context-item" data-action="add-layout">Add Layout Panel ▸
      <ul class="context-submenu">
        <li class="context-item" data-layout="horizontal">Horizontal Layout</li>
        <li class="context-item" data-layout="vertical">Vertical Layout</li>
        <li class="context-item" data-layout="grid">Grid Layout</li>
      </ul>
    </li>
    <li class="context-separator"></li>
    <li class="context-item" data-action="open-settings">Settings…</li>
  </ul>
</div>

<!-- Tab context menu -->
<div id="tab-context-menu" class="context-menu">
  <ul>
    <li class="context-item" data-action="rename-tab">Rename Tab</li>
    <li class="context-item" data-action="duplicate-tab">Duplicate Tab</li>
    <li class="context-item" data-action="close-tab">Close Tab</li>
  </ul>
</div>

<!-- Layout child context menu -->
<div id="layout-child-context-menu" class="context-menu">
  <ul>
    <li class="context-item" data-action="layout-add-premade">
      Add Premade Panel ▸
      <ul class="context-submenu" id="layout-premade-submenu"></ul>
    </li>
    <li class="context-item" data-action="layout-add-custom">Add Custom Panel</li>
    <li class="context-item" data-action="layout-add-external">Add External Panel</li>
    <li class="context-separator"></li>
    <li class="context-item" data-action="layout-remove">Remove</li>
  </ul>
</div>

<!-- Panel context menu -->
<div id="panel-context-menu" class="context-menu">
  <ul>
    <!-- Premade: swap + read more -->
    <li class="context-item panel-menu-premade" data-action="panel-swap">
      Swap ▸
      <ul class="context-submenu" id="panel-swap-premade-submenu"></ul>
    </li>
    <li class="context-item panel-menu-premade panel-menu-premade-source" data-action="panel-read-more">
      Read more
    </li>

    <li class="context-separator panel-menu-premade panel-menu-premade-source"></li>

    <!-- Custom: md import / export -->
    <li class="context-item panel-menu-custom" data-action="panel-download-custom">
      Download as .md
    </li>
    <li class="context-item panel-menu-custom" data-action="panel-load-custom">
      Load from .md…
    </li>

    <li class="context-separator panel-menu-custom"></li>

    <!-- External: open URL -->
    <li class="context-item panel-menu-external" data-action="panel-open-external">
      Open URL in new tab
    </li>

    <li class="context-separator panel-menu-external"></li>

    <!-- Layout: change mode -->
    <li class="context-item panel-menu-layout" data-action="panel-layout-horizontal">
      Layout: Horizontal
    </li>
    <li class="context-item panel-menu-layout" data-action="panel-layout-vertical">
      Layout: Vertical
    </li>
    <li class="context-item panel-menu-layout" data-action="panel-layout-grid">
      Layout: Grid
    </li>
    
    <li class="context-item panel-menu-layout-child" data-action="panel-layout-child-remove">
      Remove
    </li>

    <li class="context-separator panel-menu-layer"></li>

    <!-- Layering: all top-level panels -->
    <li class="context-item panel-menu-layer" data-action="panel-send-front">
      Bring to front
    </li>
    <li class="context-item panel-menu-layer" data-action="panel-send-back">
      Send to back
    </li>
  </ul>
</div>


<!-- Hidden file input for custom panel import -->
<input type="file" id="panel-custom-upload" accept=".md,text/markdown,text/plain" style="display:none;">