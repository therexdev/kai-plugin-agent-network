"use strict";
(() => {
  const operations = { Status: "legacyStatus", Settings: "settings", Save: "legacySave", Accepting: "accepting", Publish: "publish", Retire: "retire", Discover: "discover", Import: "import", Quote: "quote", Submit: "submit", Job: "job", Refresh: "legacyRefresh" };
  window.KaiCompanionClient = { checked: async result => { const value = await result; if (!value?.ok) throw Error(value?.error || "The service request failed."); return value.result; } };
  window.kaiCompanionBridge = { async manage(action, input = {}) {
    try {
      if (action === "status") return { ok: true, result: { workflows: await window.kai.call("agentNetwork.legacyWorkflowChoices", {}) } };
      const operation = action.startsWith("agentNetwork") && operations[action.slice(12)];
      if (!operation) throw Error("Unknown Agent Network action.");
      let result = await window.kai.call("agentNetwork." + operation, input);
      if (operation === "quote") result = result.id;
      return { ok: true, result };
    } catch (error) { return { ok: false, error: error.message }; }
  } };
  window.activateView = name => {
    if (name !== "workflows") return;
    return window.kai.call("agentNetwork.openBuilder", {}).catch(error => { const node = document.querySelector(".an-notice"); if (node) { node.textContent = error.message; node.classList.add("error"); } });
  };
})();
