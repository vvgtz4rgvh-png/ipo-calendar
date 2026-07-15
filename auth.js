(() => {
  "use strict";

  const AUTH_KEY = "ipo-auth-ok";
  const AUTH_DATA_URL = "data/auth.json";

  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function isUnlocked() {
    return sessionStorage.getItem(AUTH_KEY) === "1" || localStorage.getItem(AUTH_KEY) === "1";
  }

  function buildLockScreen() {
    const overlay = document.createElement("div");
    overlay.id = "lock-overlay";
    overlay.innerHTML = `
      <div class="lock-card">
        <div class="lock-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
        </div>
        <div class="lock-title">IPO Manager</div>
        <div class="lock-sub">合言葉を入力してください</div>
        <form id="lock-form" autocomplete="off">
          <input type="password" id="lock-input" inputmode="text" placeholder="合言葉" autocomplete="off" />
          <label class="lock-remember">
            <input type="checkbox" id="lock-remember" checked />
            <span>この端末では次回から省略する</span>
          </label>
          <button type="submit" class="lock-submit">開く</button>
        </form>
        <div class="lock-error" id="lock-error" hidden>合言葉が違います</div>
      </div>
    `;
    document.body.appendChild(overlay);

    const form = overlay.querySelector("#lock-form");
    const input = overlay.querySelector("#lock-input");
    const remember = overlay.querySelector("#lock-remember");
    const errorEl = overlay.querySelector("#lock-error");

    input.focus();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const hash = await sha256Hex(input.value);
      const correctHash = window.__ipoAuthHash;
      if (hash === correctHash) {
        const store = remember.checked ? localStorage : sessionStorage;
        store.setItem(AUTH_KEY, "1");
        overlay.classList.add("unlocking");
        setTimeout(() => overlay.remove(), 200);
        document.documentElement.classList.add("unlocked");
      } else {
        errorEl.hidden = false;
        overlay.querySelector(".lock-card").classList.add("shake");
        input.value = "";
        input.focus();
        setTimeout(() => overlay.querySelector(".lock-card").classList.remove("shake"), 400);
      }
    });
  }

  async function init() {
    let authData;
    try {
      const res = await fetch(AUTH_DATA_URL, { cache: "no-store" });
      authData = await res.json();
    } catch (err) {
      console.error("auth.json の読み込みに失敗しました", err);
      document.documentElement.classList.add("unlocked");
      return;
    }
    window.__ipoAuthHash = authData.passcodeHash;

    if (isUnlocked()) {
      document.documentElement.classList.add("unlocked");
      return;
    }
    buildLockScreen();
  }

  // Expose a manual lock function for the header button
  window.ipoLockNow = function () {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
    location.reload();
  };

  init();
})();
