import "server-only";

function need(name: string, minLen = 1): string {
  const v = process.env[name];
  if (!v || v.length < minLen) throw new Error(`Missing env var ${name}. Run "npm run setup" or see deployment.md`);
  return v;
}

export const env = {
  get sessionSecret() {
    return need("SESSION_SECRET", 32);
  },
  get gatewaySecret() {
    return need("GATEWAY_WEBHOOK_SECRET", 32);
  },
  get cronSecret() {
    return need("CRON_SECRET", 32);
  },
  get demoMode() {
    return process.env.DEMO_MODE === "true";
  },
  get appUrl() {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
};
