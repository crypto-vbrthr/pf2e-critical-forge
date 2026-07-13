const SEVERITIES = new Set(["error", "warning", "hint", "info"]);

export class ValidationReport {
  #issues = [];

  add(issue) {
    if (!issue || typeof issue !== "object") {
      throw new TypeError("Validation issue must be an object.");
    }

    if (!SEVERITIES.has(issue.severity)) {
      throw new TypeError(`Unsupported validation severity: ${issue.severity}`);
    }

    if (typeof issue.code !== "string" || !issue.code.trim()) {
      throw new TypeError("Validation issue requires a code.");
    }

    this.#issues.push(Object.freeze({
      severity: issue.severity,
      code: issue.code,
      messageKey: issue.messageKey ?? null,
      message: issue.message ?? null,
      data: foundry.utils.deepClone(issue.data ?? {}),
      componentIndex: Number.isInteger(issue.componentIndex)
        ? issue.componentIndex
        : null
    }));

    return this;
  }

  addMany(issues = []) {
    for (const issue of issues) this.add(issue);
    return this;
  }

  has(code) {
    return this.#issues.some((issue) => issue.code === code);
  }

  get issues() {
    return [...this.#issues];
  }

  get errors() {
    return this.#issues.filter((issue) => issue.severity === "error");
  }

  get warnings() {
    return this.#issues.filter((issue) => issue.severity === "warning");
  }

  get hints() {
    return this.#issues.filter((issue) => issue.severity === "hint");
  }

  get information() {
    return this.#issues.filter((issue) => issue.severity === "info");
  }

  get valid() {
    return this.errors.length === 0;
  }

  toJSON() {
    return {
      valid: this.valid,
      issues: this.issues,
      errors: this.errors,
      warnings: this.warnings,
      hints: this.hints,
      information: this.information
    };
  }
}
