// Builds README.md from docs/templates/README.template.md. Fills every marker from files (FACTS blocks, evidence), the live URL,
// the video URL (row removed if there is none) and the baseline SHA, then strips every marker comment.
// Usage: npx tsx scripts/readme.ts   (run scripts/facts.ts and scripts/evidence.ts first)
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT } from "./lib";

const rd = (p: string) => (existsSync(resolve(ROOT, p)) ? readFileSync(resolve(ROOT, p), "utf8").trim() : "");
const cfg = existsSync(resolve(ROOT, "docs/deploy.json")) ? JSON.parse(readFileSync(resolve(ROOT, "docs/deploy.json"), "utf8")) : {};
const LIVE = (cfg.liveUrl as string) ?? "https://rasure.vercel.app";
const VIDEO = (cfg.videoUrl as string) ?? "";
const baseline = execSync("git rev-list --max-parents=0 HEAD", { cwd: ROOT, encoding: "utf8" }).trim().split("\n").pop()!;

let t = rd("docs/templates/README.template.md");
const fill = (name: string, body: string) => {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const re = { test: (x: string) => x.includes(start) && x.includes(end) };
  const i = t.indexOf(start);
  const j = t.indexOf(end);
  const replaceBlock = () => {
    t = t.slice(0, i) + body.trim() + t.slice(j + end.length);
  };
  if (!re.test(t)) throw new Error(`marker ${name} missing in the template`);
  replaceBlock();
};
fill("headline", rd("docs/headline.md") || "An expired record is gone from the board. It is not gone from the chain.");
fill("wild", rd("docs/wild-table.md") || "");
fill("facts", rd("docs/facts-block.md"));
fill("txfeatures", rd("docs/txfeatures.md"));

if (!VIDEO) t = t.split("\n").filter((l) => !l.includes("VIDEO_URL")).join("\n");
t = t.replaceAll("VIDEO_URL", VIDEO).replaceAll("LIVE_URL", LIVE).replaceAll("BASELINE_SHA", baseline);
t = t.replace(/<!--[\s\S]*?-->\n?/g, "").replace(/\n{3,}/g, "\n\n");
writeFileSync(resolve(ROOT, "README.md"), t.trim() + "\n");
console.log("README.md written; live", LIVE, "baseline", baseline.slice(0, 7), VIDEO ? "video set" : "no video row");
