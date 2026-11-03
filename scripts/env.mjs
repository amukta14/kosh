// Creates .env.local with fresh random secrets if it does not exist yet.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

if (existsSync(".env.local")) {
  console.log(".env.local already exists, leaving it alone");
} else {
  const rnd = () => randomBytes(32).toString("hex");
  const out = readFileSync(".env.example", "utf8")
    .split("\n")
    .filter((l) => !l.startsWith("#"))
    .map((l) => {
      if (l.startsWith("SESSION_SECRET=")) return `SESSION_SECRET=${rnd()}`;
      if (l.startsWith("GATEWAY_WEBHOOK_SECRET=")) return `GATEWAY_WEBHOOK_SECRET=${rnd()}`;
      if (l.startsWith("CRON_SECRET=")) return `CRON_SECRET=${rnd()}`;
      return l;
    })
    .join("\n");
  writeFileSync(".env.local", out);
  console.log("Wrote .env.local with random secrets");
}
