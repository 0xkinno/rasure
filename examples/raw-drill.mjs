// The Seizure Drill with no SDK and no install. Plain JSON-RPC, the ABI decode written by hand from arkiv/schema.md,
// WebCrypto HKDF and AES-GCM. Needs Node 20+ (fetch, crypto.subtle) and nothing else.
//
//   node examples/raw-drill.mjs [path-to-drill-manifest.json] [rpc-url]
//
// It reads proof/drill-manifest.json, fetches each record's CREATION TRANSACTION, decodes the payload from the
// transaction input (not from live state), and tries to open it with only what a seized phone holds.
import { readFileSync } from "node:fs";

const manifestPath = process.argv[2] ?? new URL("../proof/drill-manifest.json", import.meta.url);
const RPC = process.argv[3] ?? "https://rpc.tiramisu.db-chain.testnet.arkiv.network";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const te = new TextEncoder();
const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (s) => Uint8Array.from(s.replace(/^0x/, "").match(/../g) ?? [], (h) => parseInt(h, 16));

let id = 1;
async function rpc(method, params) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: id++, method, params }) });
    if (r.status === 429) throw new Error(`rate limited (HTTP 429), retry-after ${r.headers.get("retry-after") ?? "unknown"} s`);
    const j = await r.json().catch(() => null);
    if (j && !j.error) return j.result;
    if (attempt === 3) throw new Error(JSON.stringify(j?.error ?? "no response"));
    await new Promise((res) => setTimeout(res, 800));
  }
}

// ---- ABI decode by hand. Input = selector(4) + abi.encode((uint8 operation, bytes operationData)[] ops)
const word = (buf, off) => {
  let v = 0n;
  for (let i = 0; i < 32; i++) v = (v << 8n) | BigInt(buf[off + i]);
  return v;
};
function decodeOps(input) {
  const buf = unhex(input).slice(4);
  const arr = Number(word(buf, 0)); // offset of the array
  const n = Number(word(buf, arr));
  const ops = [];
  for (let i = 0; i < n; i++) {
    const t = arr + 32 + Number(word(buf, arr + 32 + 32 * i)); // tuple start, relative to the start of the array data
    const operation = Number(word(buf, t));
    const bo = t + Number(word(buf, t + 32));
    const len = Number(word(buf, bo));
    ops.push({ operation, data: buf.slice(bo + 32, bo + 32 + len) });
  }
  return ops;
}
// create = abi.encode((uint128 salt, uint64 expiresAt, uint64 minLifetime, uint8 creationFlags, (bytes32 name, uint8 typeId, bytes value)[] attributes))
function decodeCreate(d) {
  const t = Number(word(d, 0)); // the single tuple parameter is dynamic: a leading offset
  const attrsOff = t + Number(word(d, t + 128));
  const n = Number(word(d, attrsOff));
  const attributes = {};
  for (let i = 0; i < n; i++) {
    const a = attrsOff + 32 + Number(word(d, attrsOff + 32 + 32 * i));
    const name = new TextDecoder().decode(d.slice(a, a + 32)).replace(/\0+$/, "");
    const vo = a + Number(word(d, a + 64));
    const len = Number(word(d, vo));
    attributes[name] = d.slice(vo + 32, vo + 32 + len);
  }
  return { expiresAt: word(d, t + 32), attributes };
}
function payloadOf(txInput) {
  for (const op of decodeOps(txInput)) if (op.operation === 1) {
    const c = decodeCreate(op.data);
    if (c.attributes["$payload"]) return c.attributes["$payload"];
  }
  return null;
}

// ---- crypto, exactly as in arkiv/schema.md: k(e+1)=HKDF(k(e),"rasure/v1","ratchet"), enc=HKDF(k,"enc"), AES-GCM, AAD
const SALT = te.encode("rasure/v1");
async function hkdf(ikm, info) {
  const base = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: SALT, info: te.encode(info) }, base, 256));
}
async function opens(chainKey, circle, epoch, type, envelope) {
  if (envelope.length < 29 || envelope[0] !== 1) return false;
  try {
    const key = await crypto.subtle.importKey("raw", await hkdf(chainKey, "enc"), "AES-GCM", false, ["decrypt"]);
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: envelope.slice(1, 13), additionalData: te.encode(`rasure/v1|${circle}|${epoch}|${type}`) }, key, envelope.slice(13));
    return true;
  } catch {
    return false;
  }
}

const totals = {};
for (const sc of manifest.scenarios) {
  let exposed = 0;
  for (const r of sc.records) {
    const tx = await rpc("eth_getTransactionByHash", [r.txHash]);
    if (!tx) throw new Error(`transaction ${r.txHash} not found`);
    const payload = payloadOf(tx.input);
    if (!payload) throw new Error(`no payload decoded from ${r.txHash}`);
    let open = false;
    if (sc.policy === "plaintext") {
      try { JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payload)); open = true; } catch { open = false; }
    } else if (sc.policy === "static_key") {
      open = await opens(unhex(sc.seized.staticKeyHex), r.circle, r.epoch, r.type, payload);
    } else {
      // The seized phone holds one chain key. It may derive FORWARD as far as it likes; there is no step backwards.
      const e0 = BigInt(sc.seized.ratchet.epoch);
      const target = BigInt(r.epoch);
      if (target >= e0) {
        let k = unhex(sc.seized.ratchet.keyHex);
        for (let e = e0; e < target; e++) k = await hkdf(k, "ratchet");
        open = await opens(k, r.circle, r.epoch, r.type, payload);
      }
    }
    if (open) exposed++;
  }
  totals[sc.id] = { exposed, total: sc.records.length };
  console.log(`${sc.title.padEnd(22)} ${exposed} of ${sc.records.length} records exposed`);
}
console.log(JSON.stringify(totals));
