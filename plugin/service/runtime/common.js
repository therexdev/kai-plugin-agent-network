"use strict";
const crypto = require("node:crypto");
class CompanionError extends Error {}
const copy = value => JSON.parse(JSON.stringify(value));
const id = () => crypto.randomUUID();
function text(value, limit, label = "Text") {
  if (typeof value !== "string" || !value.trim() || value.length > limit) throw new CompanionError(`${label} is required (maximum ${limit} characters).`);
  return value.trim();
}
module.exports = { CompanionError, copy, id, text };
