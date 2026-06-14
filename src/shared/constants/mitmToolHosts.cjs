/**
 * CommonJS mirror of mitmToolHosts.js for the MITM Node runtime.
 * Keep values in sync with mitmToolHosts.js.
 */
const TOOL_HOSTS = {
  antigravity: ["daily-cloudcode-pa.googleapis.com", "cloudcode-pa.googleapis.com"],
  copilot: ["api.individual.githubcopilot.com"],
  kiro: ["q.us-east-1.amazonaws.com", "codewhisperer.us-east-1.amazonaws.com"],
  cursor: ["api2.cursor.sh"],
};

module.exports = { TOOL_HOSTS };
