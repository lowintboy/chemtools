<script>
  let { theme, density, fontPair, showMass, onSetTweak } = $props();

  let open = $state(false);
</script>

<div class="settings-anchor">
  <button class="settings-toggle" onclick={() => (open = !open)} aria-label="Settings" title="Settings">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  </button>

  {#if open}
    <div class="settings-panel">
    <div class="settings-hd">
      <b>Settings</b>
      <button class="settings-close" onclick={() => (open = false)} aria-label="Close">&times;</button>
    </div>
    <div class="settings-body">
      <div class="settings-sect">Appearance</div>

      <div class="settings-row">
        <label class="settings-lbl">Theme</label>
        <div class="settings-seg">
          <button class:active={theme === 'light'} onclick={() => onSetTweak('theme', 'light')}>Light</button>
          <button class:active={theme === 'dark'} onclick={() => onSetTweak('theme', 'dark')}>Dark</button>
        </div>
      </div>

      <div class="settings-row">
        <label class="settings-lbl">Font pairing</label>
        <select class="settings-select" value={fontPair} onchange={(e) => onSetTweak('fontPair', e.target.value)}>
          <option value="geist-newsreader">Geist + Newsreader</option>
          <option value="ibm-plex">IBM Plex (sans + serif)</option>
          <option value="instrument">Instrument Sans + Serif</option>
        </select>
      </div>

      <div class="settings-sect">Periodic table</div>

      <div class="settings-row settings-row-h">
        <label class="settings-lbl">Show atomic mass on cells</label>
        <button
          class="settings-toggle-switch"
          data-on={showMass ? '1' : '0'}
          role="switch"
          aria-checked={showMass}
          aria-label="Show atomic mass on cells"
          onclick={() => onSetTweak('showMass', !showMass)}
        ><i></i></button>
      </div>
    </div>
  </div>
  {/if}
</div>

<style>
  .settings-toggle {
    appearance: none;
    background: var(--surface-2);
    border: 1px solid var(--rule);
    border-radius: 6px;
    padding: 6px;
    cursor: pointer;
    color: var(--ink-2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .settings-toggle:hover { background: var(--bg); color: var(--ink); }

  .settings-anchor {
    position: relative;
  }

  .settings-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 100;
    width: 280px;
    max-height: calc(100vh - 80px);
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border: 1px solid var(--rule);
    border-radius: 12px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.15);
    font-size: 12px;
    overflow: hidden;
    animation: dropDown 0.18s ease-out;
  }
  @keyframes dropDown {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .settings-hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid var(--rule);
  }
  .settings-hd b { font-size: 13px; font-weight: 600; }
  .settings-close {
    appearance: none;
    border: 0;
    background: transparent;
    color: var(--ink-3);
    cursor: pointer;
    font-size: 16px;
    padding: 2px 6px;
    border-radius: 4px;
    line-height: 1;
  }
  .settings-close:hover { background: var(--surface-2); color: var(--ink); }
  .settings-body {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
  }
  .settings-sect {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-3);
    padding-top: 4px;
  }
  .settings-sect:first-child { padding-top: 0; }
  .settings-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .settings-row-h {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .settings-lbl {
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .settings-seg {
    display: flex;
    padding: 2px;
    border-radius: 8px;
    background: var(--surface-2);
    gap: 0;
  }
  .settings-seg button {
    appearance: none;
    flex: 1;
    border: 0;
    background: transparent;
    color: var(--ink-2);
    font: inherit;
    font-size: 11px;
    font-weight: 500;
    height: 26px;
    border-radius: 6px;
    cursor: pointer;
    padding: 0 8px;
    transition: background 0.15s, color 0.15s;
  }
  .settings-seg button.active {
    background: var(--surface);
    color: var(--ink);
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }
  .settings-select {
    appearance: none;
    width: 100%;
    height: 28px;
    padding: 0 28px 0 8px;
    border: 1px solid var(--rule);
    border-radius: 6px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-size: 12px;
    outline: none;
    cursor: pointer;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.4)' d='M0 0h10L5 6z'/></svg>");
    background-repeat: no-repeat;
    background-position: right 8px center;
  }
  .settings-select:focus { border-color: var(--accent); }

  .settings-toggle-switch {
    position: relative;
    width: 34px;
    height: 20px;
    border: 0;
    border-radius: 999px;
    background: var(--rule);
    transition: background 0.15s;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
  }
  .settings-toggle-switch[data-on="1"] { background: var(--accent); }
  .settings-toggle-switch i {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    transition: transform 0.15s;
    display: block;
  }
  .settings-toggle-switch[data-on="1"] i { transform: translateX(14px); }
</style>
