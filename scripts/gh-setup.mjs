// Sets the night-watch GitHub Actions secrets and variables for 0xkinno/rasure from local files (.secrets/watch.json, .env.local).
// The token comes from the local git credential helper and is never printed. Values are sealed with the repo public key.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import sodium from "libsodium-wrappers";

const REPO = "0xkinno/rasure";
const token = execSync('git credential fill', { input: "protocol=https\nhost=github.com\n\n", encoding: "utf8" }).split("\n").find((l) => l.startsWith("password="))?.slice(9);
if (!token) throw new Error("no GitHub token from the credential helper");
const api = (path, init = {}) => fetch(`https://api.github.com/repos/${REPO}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "content-type": "application/json", ...(init.headers ?? {}) } });

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const watch = JSON.parse(readFileSync(".secrets/watch.json", "utf8"));
const secrets = { DEMO_CHAIN_KEY: watch.chainKeyHex, DISPATCHER_KEY: env.DISPATCHER_PRIVATE_KEY, VOLUNTEER_A_KEY: env.VOLUNTEERA_PRIVATE_KEY, ARKIV_ACCESS_KEY: env.ARKIV_ACCESS_KEY };
const vars = { WATCH_CIRCLE: watch.circle, WATCH_GENESIS: watch.genesis, WATCH_EPOCH_BLOCKS: watch.epochBlocks };

await sodium.ready;
const pk = await (await api("/actions/secrets/public-key")).json();
for (const [name, value] of Object.entries(secrets)) {
  if (!value) throw new Error(`missing value for ${name}`);
  const sealed = sodium.to_base64(sodium.crypto_box_seal(sodium.from_string(value), sodium.from_base64(pk.key, sodium.base64_variants.ORIGINAL)), sodium.base64_variants.ORIGINAL);
  const r = await api(`/actions/secrets/${name}`, { method: "PUT", body: JSON.stringify({ encrypted_value: sealed, key_id: pk.key_id }) });
  console.log("secret", name, r.status);
}
for (const [name, value] of Object.entries(vars)) {
  let r = await api("/actions/variables", { method: "POST", body: JSON.stringify({ name, value }) });
  if (r.status === 409 || r.status === 422) r = await api(`/actions/variables/${name}`, { method: "PATCH", body: JSON.stringify({ name, value }) });
  console.log("variable", name, r.status);
}
