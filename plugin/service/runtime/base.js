"use strict";
const { CompanionError } = require("./common");
// Job-local state only. No Brain, connections, account, desktop or service SDK.
class JobBase {
  constructor({ store, runLocal, models }) {
    Object.assign(this, { store, runLocal, models, active: new Map() });
    if (!store.locked && store.available() && store.data.runs.some(run => run.status === "running")) store.change(data => {
      for (const run of data.runs) if (run.status === "running") {
        run.status = "interrupted";
        run.error = run.inFlight ? "Stopped during a step. Inspect the result before starting another job." : "Restarted between steps. Resume when ready.";
      }
    });
  }
  get(key) { return this.store.data.runs.find(run => run.id === key); }
  patch(key, fn) { this.store.change(data => { const run = data.runs.find(run => run.id === key); if (!run) throw new CompanionError("Run no longer exists"); fn(run); }); }
  launch(key, approved = false) {
    if (this.active.has(key) || this.active.size >= 2) throw new CompanionError("Service execution slots are busy");
    const controller = new AbortController(); this.active.set(key, controller);
    void this.drive(key, controller.signal, approved).catch(error => {
      if (this.get(key)?.status === "cancelled") return;
      try { this.patch(key, run => { run.status = "failed"; run.error = String(error.message).slice(0, 500); run.finishedAt = Date.now(); }); } catch { controller.abort(); }
    }).finally(() => this.active.delete(key));
  }
  resume(key) {
    const run = this.get(key);
    if (!run || !["waiting", "interrupted"].includes(run.status)) throw new CompanionError("This run is not waiting");
    if (run.inFlight) throw new CompanionError("An interrupted step has an uncertain result. Cancel this run before starting another.");
    this.launch(key, run.status === "waiting");
  }
  cancel(key) { if (!this.get(key)) throw new CompanionError("Run no longer exists"); this.active.get(key)?.abort(); this.patch(key, run => { run.status = "cancelled"; run.finishedAt = Date.now(); run.pending = null; }); }
  stop() { for (const controller of this.active.values()) controller.abort(); }
}
module.exports = { CompanionWorkflows: require("./engine").createClass(JobBase) };
