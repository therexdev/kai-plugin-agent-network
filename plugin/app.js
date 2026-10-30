"use strict";
(() => {
  const $ = id => document.getElementById(id);
  let state = null, pending = false;
  const call = (operation, input = {}) => window.kai.call(`agentNetwork.${operation}`, input);
  const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
  function message(text, error = false) { $("message").textContent = text; $("message").className = error ? "error" : ""; }
  function tab(id) {
    for (const button of document.querySelectorAll("[data-tab]")) button.setAttribute("aria-selected", String(button.dataset.tab === id));
    for (const view of document.querySelectorAll(".view")) view.hidden = view.id !== id;
  }
  async function action(task, success) {
    if (pending) return;
    pending = true; message("Working…");
    const buttons = [...document.querySelectorAll("button")]; buttons.forEach(b => { b.disabled = true; });
    try { await task(); await refresh(); message(success || "Saved."); }
    catch (error) { message(error.message || String(error), true); }
    finally { pending = false; buttons.forEach(b => { b.disabled = false; }); }
  }
  function button(label, fn, secondary = true) { const node = el("button", label, secondary ? "secondary" : ""); node.type = "button"; node.addEventListener("click", () => action(fn)); return node; }
  function options(select, items, empty) {
    const selected = select.value; select.replaceChildren();
    if (!items.length) { const option = el("option", empty); option.value = ""; select.append(option); return; }
    for (const item of items) { const option = el("option", item.label); option.value = item.value; select.append(option); }
    if (items.some(x => x.value === selected)) select.value = selected;
  }
  function chooseJob(id) { tab("jobs"); $("job-service").value = id; $("job-input").focus(); }
  async function exportService(id, kind) {
    const result = await call("export", { id, kind }); $("export-title").textContent = result.name + (kind === "definition" ? " · workflow package" : " · signed invitation");
    $("export-note").textContent = kind === "definition" ? "This package includes your service instructions. Share only if you intend to disclose how the agent works." : "This signed public card identifies the service and its limits. It expires after seven days; save a new service version to renew it.";
    $("export-text").value = result.text; $("export-panel").hidden = false; $("export-panel").scrollIntoView({ behavior: "smooth" });
  }
  function serviceCard(service, own) {
    const card = el("article", undefined, "card"), head = el("div", undefined, "card-head"), text = el("div");
    text.append(el("h3", service.name), el("p", service.description || "Private service")); head.append(text, el("span", own ? service.accepting ? "Accepting jobs" : "Paused" : "Free service", "tag")); card.append(head);
    card.append(el("p", own ? `${service.published ? "Published to a relay" : "Local service"} · version ${service.sequence}${service.safe ? "" : " · needs review before use"}` : `Operator ${service.owner} · expires ${new Date(service.expiresAt).toLocaleDateString()}`, "meta"));
    const actions = el("div", undefined, "actions");
    actions.append(button(own ? "Test locally" : "Request service", () => chooseJob(service.id), false));
    if (own) {
      actions.append(button("Renew card", () => call("save", { id: service.id })), button("Export invitation", () => exportService(service.id, "card")), button("Export workflow", () => exportService(service.id, "definition")), button("Publish", () => call("publish", { id: service.id })), button(service.accepting ? "Pause hosting" : "Accept jobs", () => call("accepting", { id: service.id, enabled: !service.accepting })));
      if (service.published) actions.append(button("Retire listing", () => call("retire", { id: service.id })));
    }
    card.append(actions); return card;
  }
  function jobCard(job) {
    const card = el("article", undefined, "card"), head = el("div", undefined, "card-head");
    head.append(el("h3", job.name), el("span", job.status.replaceAll("_", " "), "tag")); card.append(head, el("p", `${job.role === "host" ? "Hosting" : "Requested"} · ${new Date(job.at).toLocaleString()} · ${job.modelCalls} model calls`, "meta"));
    if (job.error) card.append(el("p", job.error));
    const actions = el("div", undefined, "actions");
    if (job.role === "buyer" && job.status === "quoted") actions.append(button("Review & run", () => call("submit", { id: job.id }), false));
    if (job.hasOutput) actions.append(button("View result", async () => { const detail = await call("jobDetail", { id: job.id, role: job.role }); $("result-title").textContent = detail.name + " · " + detail.status; $("result-output").textContent = typeof detail.output === "string" ? detail.output : JSON.stringify(detail.output, null, 2); $("result-panel").hidden = false; $("result-panel").scrollIntoView({ behavior: "smooth" }); }));
    const perform = action => () => call("job", { id: job.id, role: job.role, action });
    if (job.role === "buyer" && job.status === "delivered") actions.append(button("Accept result", perform("accept"), false), button("Reject result", perform("reject")));
    if (job.role === "host" && job.status === "waiting") actions.append(button("Approve step", perform("approve"), false));
    if (job.role === "host" && job.status === "interrupted") actions.append(button("Review & resume", perform("resume")));
    if (!["accepted", "cancelled", "failed", "rejected"].includes(job.status)) actions.append(button("Cancel", perform("cancel")));
    else actions.append(button("Remove receipt", perform("remove")));
    card.append(actions); return card;
  }
  function render() {
    $("services-count").textContent = state.agents.length; $("jobs-count").textContent = state.jobs.length; $("relay-count").textContent = state.endpoints.length;
    $("session").textContent = state.sessionActive ? `Session active · ${state.privacyMode === "local-only" ? "Local-Only privacy" : state.endpoints.length ? "Relays configured" : "Local services"}` : "Session paused · saved data retained";
    $("directory-note").textContent = state.notice;
    $("address").value = state.address || "";
    $("start-session").textContent = state.sessionActive ? "Apply connection settings" : "Start session";
    for (const [id, data, renderItem, empty] of [["service-list", state.agents, s => serviceCard(s, true), "Your first useful service starts here. Start a session in Connection, then create a service below."], ["directory-list", state.cards, s => serviceCard(s, false), "No invitations saved yet. Search a configured relay or import a signed invitation."], ["job-list", state.jobs, jobCard, "No jobs yet. Test a local service or request one from your saved invitations."]]) {
      $(id).replaceChildren(...(data.length ? data.map(renderItem) : [el("p", empty, "empty")]));
    }
    options($("model"), state.models.map(m => ({ value: m.alias, label: m.label || m.alias })), "No installed local models");
    const services = [...state.agents.map(s => ({ value: s.id, label: s.name + " · this device" })), ...state.cards.filter(c => !state.agents.some(s => s.id === c.id)).map(s => ({ value: s.id, label: s.name + " · external" }))];
    options($("job-service"), services, "Create or import a service first");
  }
  async function refresh(initial = false) { state = await call("status"); if (initial) $("endpoints").value = state.endpoints.join("\n"); render(); }
  document.querySelectorAll("[data-tab]").forEach(b => b.addEventListener("click", () => tab(b.dataset.tab)));
  $("refresh").addEventListener("click", () => action(() => call("refresh"), "Service status refreshed."));
  $("settings-form").addEventListener("submit", event => { event.preventDefault(); action(() => call("settings", { enabled: true, endpoints: $("endpoints").value.split(/\r?\n/).map(s => s.trim()).filter(Boolean) }), "Session started. Services are available while this plugin is open."); });
  $("stop-session").addEventListener("click", () => action(() => call("settings", { enabled: false }), "Service session paused."));
  $("create-form").addEventListener("submit", event => { event.preventDefault(); action(async () => { const input = { name: $("service-name").value, description: $("service-description").value, template: $("template").value, model: $("model").value }; if ($("instructions").value.trim()) input.instructions = $("instructions").value; await call("save", input); }, "Service saved locally. Test it before sharing."); });
  $("load-workflows").addEventListener("click", () => action(async () => { const choices = await call("workflowChoices"); options($("workflow"), choices.map(w => ({ value: w.id, label: w.name })), "No compatible saved workflows"); }, "Compatible workflows loaded."));
  $("from-workflow").addEventListener("click", () => action(() => call("fromWorkflow", { workflowId: $("workflow").value }), "Workflow copied into a local service."));
  $("search-form").addEventListener("submit", event => { event.preventDefault(); action(() => call("discover", { query: $("query").value }), "Configured relays searched. Valid service cards are saved here."); });
  $("import-form").addEventListener("submit", event => { event.preventDefault(); action(() => call("import", { text: $("invitation").value }), "Signed invitation verified and saved."); });
  $("quote-form").addEventListener("submit", event => { event.preventDefault(); action(() => call("quote", { id: $("job-service").value, input: $("job-input").value }), "Quote requested. Review and run when the host returns a quote."); });
  $("close-export").addEventListener("click", () => { $("export-panel").hidden = true; });
  $("select-export").addEventListener("click", () => { $("export-text").focus(); $("export-text").select(); message("Text selected. Press Ctrl+C or Command+C to copy."); });
  if (!window.kai || window.kai.apiVersion < 2) { message("This plugin needs KAI Core with plugin API 2. Update Core before opening it.", true); document.querySelectorAll("button").forEach(b => { b.disabled = true; }); return; }
  refresh(true).catch(error => message(error.message, true));
  const poll = setInterval(() => { if (!pending && state?.sessionActive) refresh().catch(error => message(error.message, true)); }, 3000);
  window.addEventListener("unload", () => clearInterval(poll));
})();
