<?php
// partials/settings-modal.php
?>
<div id="settings-overlay" class="settings-overlay hidden">
  <div class="settings-modal">
    <div class="settings-header">
      <h2>Settings</h2>
      <button id="settings-close" class="settings-close-btn">&times;</button>
    </div>
    <div class="settings-body">
      <section>
        <h3>Tab Bar Position</h3>
        <label><input type="radio" name="tabbar-position" value="bottom" checked> Bottom</label>
        <label><input type="radio" name="tabbar-position" value="top"> Top</label>
        <label><input type="radio" name="tabbar-position" value="left"> Left</label>
        <label><input type="radio" name="tabbar-position" value="right"> Right</label>
      </section>

      <section>
        <h3>Desktop Background</h3>
        <label class="background-url-label">
          Image URL:
          <div class="background-url-picker">
            <input type="text" id="background-url-input" placeholder="https://example.com/bg.jpg">
            <button
              type="button"
              id="background-url-presets-btn"
              class="background-url-presets-btn"
              aria-haspopup="true"
              aria-expanded="false"
              title="Choose a preset background"
            >&#9733;</button>
            <ul id="background-url-presets" class="background-url-presets" role="menu"></ul>
          </div>
        </label>

        <div id="background-video-options" class="background-video-options">
          <label>
            <input type="checkbox" id="background-video-muted" checked>
            Mute audio
          </label>
        </div>

        <div style="margin-top: 6px;">
          <strong style="font-size: 13px;">Display:</strong>
          <label><input type="radio" name="background-mode" value="fit"> Fit</label>
          <label><input type="radio" name="background-mode" value="envelop" checked> Envelop</label>
          <label><input type="radio" name="background-mode" value="tiled"> Tiled</label>
        </div>

        <div style="margin-top: 6px;">
          <label style="display:flex; align-items:center; gap:6px; font-size:13px;">
            Background Color:
            <input type="color" id="background-color-input" value="#1e1f22">
          </label>
        </div>

        <div style="margin-top: 6px;">
          <label style="display:flex; align-items:center; gap:6px; font-size:13px;">
            Image Opacity:
            <span id="background-opacity-value">100%</span>
          </label>
          <input type="range" id="background-opacity-slider" min="0" max="100" value="100" style="width:100%;">
        </div>
      </section>

      <section>
        <h3>Import / Export GM Screen</h3>
        <div class="settings-row">
          <button id="export-json-btn">Export JSON (Download)</button>
        </div>
        <div class="settings-row">
          <label class="file-input-label">
            Import JSON File:
            <input type="file" id="import-json-file" accept="application/json">
          </label>
        </div>
      </section>
    </div>
  </div>
</div>