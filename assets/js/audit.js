/**
 * HyperNova Technology - Audit Log No-Op Module
 */

class AuditLogger {
  async log(action, actorEmail, actorRole, targetId = '', details = {}) {
    // Audit logging disabled as requested
    return Promise.resolve();
  }

  async getLogs() {
    return Promise.resolve([]);
  }
}

window.HyperNovaAudit = new AuditLogger();
