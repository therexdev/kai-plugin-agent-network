"use strict";
(() => {
  function update() {
    for (const node of document.querySelectorAll(".hub-notice,.wf-notice,.an-notice")) {
      const detail = node.querySelector(".kai-notice-text");
      if (node.querySelector(".kai-notice-close") && detail) continue;
      const message = node.textContent.trim();
      if (!message) continue;
      window.KaiPluginNotice.attach(node).show(message, { error: node.classList.contains("error") });
    }
  }
  new MutationObserver(update).observe(document.body, { childList: true, subtree: true, characterData: true });
  update();
})();
