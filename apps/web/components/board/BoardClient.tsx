"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "qrcode";
import { createPublicClient } from "@arkiv-network/sdk";
import { tiramisu } from "@arkiv-network/sdk/chains";
import { createPublicClient as viemPublicClient, webSocket, type Hex } from "viem";
import { eq } from "@arkiv-network/sdk/query";
import { key } from "@arkiv-network/sdk/attr";
import {
  q5Claims, EpochTooLateError, advance, assignClaim, assignAndClosePrevious, claimRide, closeRide, createCircle, currentKey, epochAt, extendCircle,
  fetchAll, guarded, keyDeathBlock, keyFor, newChain, open, partitionRides, postRide, q1OpenBoard, q2Zone, q3bRelated, q4Forged, q6Circle,
  rideStatus, toChainEntity, visibleRecords, zoneTag, aad, detectRateLimit, openRekey, isValidDeviceKey, postMember, q9Members, q10Rekeys,
  cancelRide, withdrawClaim, deleteNotice, handOver, rekeyAndPatch, publishTally, extendTally, openNetwork, q11Handovers, q12Tallies, q13DyingSoon,
  q14Circles, partitionRidesAt, holders, ownerAt, type OwnerTimeline, type MoreWriter,
  type ArkivWriter, type ChainEntity, type EntityType,
} from "@rasure/core";
import { useWallet, fmtGlm } from "@/lib/wallet";
import { reader, readWithRelay } from "@/lib/chain";
import { dataExplorerKey } from "@/lib/dataExplorer";
import { DemoView } from "./DemoView";
import { RPC_WS, FAUCET, txUrl, addrUrl, short, TRUSTED_DISPATCHERS, DEMO_CIRCLE } from "@/lib/config";
import {
  type Ring, advanceAndSave, createDispatcherRing, encodeJoin, deleteDeviceKey, ensureDeviceKey, listCircles, loadDeviceKey, loadRing, saveRing,
} from "@/lib/keyring";

const LANDMARKS = ["SYN-gate-4", "SYN-temple-steps", "SYN-bus-bay-2", "SYN-clinic-side-door", "SYN-market-arch"];
const ZONES = ["SYN-zone-north", "SYN-zone-east", "SYN-zone-south", "SYN-zone-west"];
const WINDOWS = ["20:00 to 21:00", "21:00 to 22:00", "22:00 to 23:00", "23:00 to 00:00", "00:00 to 01:00", "01:00 to 02:00"];

type Card = {
  entity: ChainEntity;
  epoch: bigint;
  body: { landmark?: string; window?: string; seats?: number; note?: string } | null;
  status: ReturnType<typeof rideStatus>["status"];
  claims: { entity: ChainEntity; body: { eta?: string; vehicle?: string } | null }[];
};
type TxState = { phase: "idle" } | { phase: "signing"; what: string } | { phase: "done"; what: string; hash: string; key?: string; expiresAt?: string } | { phase: "error"; what: string; msg: string };

const hex16 = () => Array.from(crypto.getRandomValues(new Uint8Array(16))).map((b) => b.toString(16).padStart(2, "0")).join("");
const mmss = (blocks: bigint) => {
  const s = Number(blocks < 0n ? 0n : blocks) * 2;
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const attrNum = (e: ChainEntity, k: string) => BigInt(e.attributes[k] as string | number | bigint);

export function BoardClient() {
  const w = useWallet();
  const params = useSearchParams();
  const [circles, setCircles] = useState<string[]>([]);
  const [circle, setCircle] = useState<string>("");
  const [ring, setRing] = useState<Ring | null>(null);
  const [head, setHead] = useState<bigint | null>(null);
  const [live, setLive] = useState<"connecting" | "socket" | "down">("connecting");
  const [cards, setCards] = useState<Card[] | null>(null);
  const [ignoredRides, setIgnoredRides] = useState<ChainEntity[]>([]);
  const [ignoredAssigns, setIgnoredAssigns] = useState<ChainEntity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [relayNote, setRelayNote] = useState<string | null>(null);
  const [tx, setTx] = useState<TxState>({ phase: "idle" });
  const [erased, setErased] = useState<{ epochs: bigint[]; at: number; count: number } | null>(null);
  const [night, setNight] = useState(false);
  const [zone, setZone] = useState<string>("");
  const [joinQr, setJoinQr] = useState<{ url: string; png: string } | null>(null);
  const [leaseUntil, setLeaseUntil] = useState<{ key: Hex; expiresAt: bigint } | null>(null);
  const [replayMsg, setReplayMsg] = useState<string | null>(null);
  const [members, setMembers] = useState<{ creator: string; pub: Uint8Array }[]>([]);
  const [keepSet, setKeepSet] = useState<Set<string>>(new Set());
  const [rekeyNote, setRekeyNote] = useState<string | null>(null);
  const [myClaims, setMyClaims] = useState<number | null>(null);
  const [anchorInfo, setAnchorInfo] = useState<{ key: Hex; creator: string; owner: string; gen: bigint; updatedAt: bigint | null } | null>(null);
  const [timeline, setTimeline] = useState<OwnerTimeline | null>(null);
  const [handoverBlock, setHandoverBlock] = useState<bigint | null>(null);
  const [handoverTo, setHandoverTo] = useState("");
  const [tallies, setTallies] = useState<{ key: Hex; creator: string; owner: string; epoch: bigint; served: bigint; expiresAt: bigint }[]>([]);
  const [heldNetworks, setHeldNetworks] = useState<string[]>([]);
  const [dyingSoon, setDyingSoon] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const accountRef = useRef<string | null>(null);
  accountRef.current = w.account;
  const [form, setForm] = useState({ landmark: LANDMARKS[0], zone: ZONES[0], window: WINDOWS[0], seats: 2, note: "SYN-note: two passengers, one small bag" });
  const [epochBlocks, setEpochBlocks] = useState("300");
  const ringRef = useRef<Ring | null>(null);
  ringRef.current = ring;
  const cardsRef = useRef<Card[] | null>(null);
  cardsRef.current = cards;

  const holderNow = (anchorInfo?.owner ?? ring?.dispatchers[0] ?? "").toLowerCase();
  const isDispatcher = !!ring && !!w.account && w.account.toLowerCase() === holderNow;
  const dispatchers = ring?.dispatchers ?? TRUSTED_DISPATCHERS;

  // ---- circles known to this device
  useEffect(() => {
    listCircles().then((l) => {
      setCircles(l);
      const want = params.get("circle") || l[0] || DEMO_CIRCLE || "";
      if (want) setCircle(want);
    });
  }, [params]);
  useEffect(() => {
    if (!circle) return setRing(null);
    loadRing(circle).then(setRing);
  }, [circle]);

  // ---- live block heads and entity events over one WebSocket; no fromBlock
  useEffect(() => {
    let stop: (() => void) | undefined;
    let stopEv: (() => void) | undefined;
    let dead = false;
    reader.getBlockNumber({ cacheTime: 0 }).then((b) => !dead && setHead(b)).catch((e) => setError(detectRateLimit(e)?.message ?? (e as Error).message));
    try {
      const ws = createPublicClient({ chain: tiramisu, transport: webSocket(RPC_WS) });
      const blocks = viemPublicClient({ chain: tiramisu, transport: webSocket(RPC_WS) });
      stop = blocks.watchBlockNumber({
        onBlockNumber: (b: bigint) => { setLive("socket"); setHead(b); },
        onError: () => setLive("down"),
      });
      stopEv = ws.watchEntityEvents({
        onEntityCreated: () => scheduleRefetch(),
        onExpiryExtended: () => scheduleRefetch(),
        onOwnershipTransferred: (ev) => {
          setBanner(`Ownership of entity ${ev.entityKey.slice(0, 10)}... moved to ${ev.newOwner ?? "a new holder"} (live event).`);
          scheduleRefetch();
        },
        onEntityDeleted: (ev) => {
          setCards((cs) => (cs ? cs.filter((c) => c.entity.key.toLowerCase() !== ev.entityKey.toLowerCase()) : cs)); // disappears from every board at once
          scheduleRefetch();
        },
        onError: () => setLive("down"),
      });
    } catch { setLive("down"); }
    return () => { dead = true; stop?.(); stopEv?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (live !== "down") return;
    const t = setInterval(() => reader.getBlockNumber({ cacheTime: 0 }).then(setHead).catch(() => undefined), 6000);
    return () => clearInterval(t);
  }, [live]);

  // ---- advance the key ring on every head: destroy dead keys, overwrite the stored record
  useEffect(() => {
    const r = ringRef.current;
    if (!r || head === null) return;
    if (head < r.state.clock.genesisBlock) return;
    advanceAndSave(r, head).then(({ ring: next, destroyed }) => {
      if (destroyed.length) {
        const count = (cardsRef.current ?? []).filter((c) => destroyed.includes(c.epoch)).length;
        setErased({ epochs: destroyed, at: Date.now(), count });
      }
      if (destroyed.length || next.state.keys.length !== r.state.keys.length) setRing(next);
    }).catch(() => undefined);
  }, [head, ring?.state.circle]);

  // ---- board reads: Q1 (or Q2 with a zone), Q3b, Q4, Q6
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadRef = useRef<() => Promise<void>>(async () => undefined);
  const scheduleRefetch = () => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => { void loadRef.current(); }, 1200); // always the latest loader (current zone filter)
  };
  const load = useCallback(async () => {
    const r = ringRef.current;
    if (!r) return;
    setError(null);
    try {
      const h = await reader.getBlockNumber({ cacheTime: 0 });
      const epoch = epochAt(r.state.clock, h < r.state.clock.genesisBlock ? r.state.clock.genesisBlock : h);
      const run = async (where: any, sel: Record<string, true>, extra: { createdBy?: string; ownedBy?: string } = {}) => {
        try { return await fetchAll(reader as any, sel, where, { atBlock: h, ...extra }); }
        catch (e) {
          const rl = detectRateLimit(e);
          if (!rl) throw e;
          setRelayNote(`Anonymous RPC limit reached (${rl.message}). Reads continue through the read-only relay.`);
          const { relayReader } = await import("@/lib/chain");
          return fetchAll(relayReader() as any, sel, where, { atBlock: h, ...extra });
        }
      };
      const sel = { key: true, creator: true, owner: true, createdAt: true, expiresAt: true, attributes: true, payload: true } as const;
      const light = { key: true, creator: true, owner: true, createdAt: true, expiresAt: true, attributes: true } as const;
      // 1. The anchor first: its $creator, current $owner and public `gen` decide who is trusted and whether a rekey happened.
      const anchorRes = await run(q6Circle(r.state.circle), { key: true, creator: true, owner: true, createdAt: true, updatedAt: true, expiresAt: true, attributes: true }, { createdBy: r.dispatchers[0] });
      const a = (anchorRes.entities as any[])[0];
      if (!a) { setAnchorInfo(null); setTimeline(null); setCards([]); return; }
      const aCreator = String(a.creator).toLowerCase();
      const aOwner = String(a.owner).toLowerCase();
      const gen = BigInt((toChainEntity(a).attributes.gen as string | bigint | undefined) ?? 1n);
      setLeaseUntil({ key: a.key, expiresAt: BigInt(a.expiresAt) });
      setAnchorInfo({ key: a.key, creator: aCreator, owner: aOwner, gen, updatedAt: a.updatedAt !== undefined ? BigInt(a.updatedAt) : null });
      // 2. Handover timeline (I9). Each handover record's creation block is verified against the anchor's owner at that block.
      const changes: { block: bigint; owner: string }[] = [];
      let hBlock: bigint | null = null;
      if (aOwner !== aCreator) {
        const hs = await run(q11Handovers(r.state.circle), { key: true, creator: true, createdAt: true });
        for (const hrec of (hs.entities as any[]).slice(0, 3)) {
          const blk = BigInt(hrec.createdAt);
          const at = await readWithRelay((rc) => rc.select({ key: true, owner: true }).where(eq("$key", key(a.key))).atBlock(blk).fetch()).catch(() => null);
          const ownerThen = at?.value.entities[0]?.owner;
          if (ownerThen) changes.push({ block: blk, owner: String(ownerThen).toLowerCase() });
        }
        if (changes.length === 0) changes.push({ block: 0n, owner: aOwner }); // handed over more than two epochs ago: all live rides are after it
        hBlock = changes[changes.length - 1]?.block ?? null;
      }
      const tl: OwnerTimeline = { creator: aCreator, changes };
      setTimeline(tl);
      setHandoverBlock(hBlock && hBlock > 0n ? hBlock : null);
      const trusted = holders(tl);

      let where;
      if (zone) {
        const pairs = r.state.keys.map((k) => ({ epoch: k.epoch, tag: zoneTag(k.chainKey, zone) }));
        where = pairs.length ? q2Zone(r.state.circle, trusted, pairs) : q1OpenBoard(r.state.circle, epoch, trusted);
      } else where = q1OpenBoard(r.state.circle, epoch, trusted);
      const [rides, related, forged, tallyRes, soon] = await Promise.all([
        run(where, sel),
        run(q3bRelated(r.state.circle, epoch, trusted), sel),
        run(q4Forged(r.state.circle, trusted), light),
        run(q12Tallies(r.state.circle, trusted), light),
        run(q13DyingSoon(r.state.circle, epoch, trusted, h + 300n), { key: true }),
      ]);
      setDyingSoon(soon.entities.length);
      setTallies((tallyRes.entities as any[]).map((e) => {
        const ce = toChainEntity(e);
        return { key: e.key, creator: ce.creator, owner: ce.owner, epoch: BigInt(ce.attributes.epoch as string | bigint), served: BigInt(ce.attributes.served as string | bigint), expiresAt: ce.expiresAt };
      }));
      if (accountRef.current) {
        const held = await run(q14Circles(), { key: true, attributes: true }, { ownedBy: accountRef.current });
        setHeldNetworks((held.entities as any[]).map((e) => String(toChainEntity(e).attributes.circle)));
      } else setHeldNetworks([]);

      // Q5: my claims, filtered by the SDK createdBy() on the connected wallet.
      if (accountRef.current && r.role === "member") {
        const mine = await run(q5Claims(r.state.circle), { key: true }, { createdBy: accountRef.current });
        setMyClaims(mine.entities.length);
      } else setMyClaims(null);
      // Rekey: the dispatcher lists member device keys; a member looks for a rekey only when the anchor's public `gen` moved.
      if (r.role === "dispatcher" || accountRef.current?.toLowerCase() === aOwner) {
        const m = await run(q9Members(r.state.circle), { key: true, creator: true, payload: true });
        setMembers((m.entities as any[]).map((e) => ({ creator: String(e.creator), pub: e.payload as Uint8Array })));
      } else if ((r.gen ?? 1n) < gen) {
        const dev = await loadDeviceKey(r.state.circle);
        if (dev) {
          const rk = await run(q10Rekeys(r.state.circle, epoch, trusted), { key: true, creator: true, attributes: true, payload: true });
          for (const e of rk.entities as any[]) {
            const eff = BigInt(toChainEntity(e).attributes.epoch as string | bigint);
            if (r.pending && r.pending.epoch >= eff) continue;
            const got = await openRekey(r.state.circle, eff, e.payload as Uint8Array, dev);
            if (got.ok) {
              const next = { ...r, gen, pending: { epoch: got.epoch, chainKey: got.chainKey } };
              await saveRing(next);
              await deleteDeviceKey(r.state.circle); // the secret that opened this entry is destroyed, so history cannot be unwrapped later
              setRing(next);
              setRekeyNote(`A rekey for epoch ${got.epoch.toString()} was sealed to this device (generation ${gen.toString()}). The new chain starts at that epoch.`);
            }
          }
        }
      }

      const live = new Set(r.state.keys.map((k) => k.epoch));
      const rideEnts = (rides.entities as any[]).map(toChainEntity);
      const { counted, ignored: ignoredByTime } = partitionRidesAt(rideEnts, tl); // I4 and I9: the creator held the circle at the ride's block
      const visible = visibleRecords(counted, live, h);
      const relEnts = (related.entities as any[]).map(toChainEntity);
      const relRaw = new Map((related.entities as any[]).map((e) => [String(e.key), e]));
      const rawRides = new Map((rides.entities as any[]).map((e) => [String(e.key), e]));
      const out: Card[] = [];
      for (const ent of visible) {
        const ep = attrNum(ent, "epoch");
        const ck = keyFor(r.state, ep);
        const raw = rawRides.get(ent.key);
        const opened = raw?.payload ? await open<any>(ck, { circle: r.state.circle, epoch: ep, type: "ride" }, raw.payload) : { ok: false as const };
        const st = rideStatus(ent, relEnts, tl); // I7 with handover
        const claims = [];
        for (const c of relEnts.filter((x) => x.attributes.type === "claim" && String(x.attributes.ref) === ent.key)) {
          const rawc = relRaw.get(c.key);
          const oc = rawc?.payload ? await open<any>(ck, { circle: r.state.circle, epoch: ep, type: "claim" }, rawc.payload) : { ok: false as const };
          // A claim counts only if it opens AND names this ride AND this claimant (blocks replayed or spam claims).
          const okBody = oc.ok && String(oc.body?.ride ?? "").toLowerCase() === ent.key.toLowerCase() && String(oc.body?.by ?? "").toLowerCase() === c.creator.toLowerCase();
          if (okBody) claims.push({ entity: c, body: oc.body });
        }
        const status = st.status === "claimed" && claims.length === 0 ? "open" : st.status;
        out.push({ entity: ent, epoch: ep, body: opened.ok ? opened.body : null, status, claims });
      }
      out.sort((x, y) => Number(y.epoch - x.epoch) || (x.entity.key < y.entity.key ? -1 : 1));
      setCards(out);
      setIgnoredRides([...(forged.entities as any[]).map(toChainEntity), ...ignoredByTime]);
      const rideCreator = new Map(rideEnts.map((x) => [x.key, x.creator.toLowerCase()]));
      setIgnoredAssigns(relEnts.filter((x) => x.attributes.type === "assign" && rideCreator.has(String(x.attributes.ref)) && x.createdAt !== undefined && x.creator.toLowerCase() !== ownerAt(tl, x.createdAt)));
    } catch (e: any) {
      const rl = detectRateLimit(e);
      setError(rl ? rl.message : (e?.message ?? String(e)).slice(0, 300));
    }
  }, [zone]);
  loadRef.current = load;
  useEffect(() => { if (ring) void load(); }, [ring?.state.circle, zone, load]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastEpoch = useRef<bigint | null>(null);
  useEffect(() => {
    if (!ring || head === null || head < ring.state.clock.genesisBlock) return;
    const e = epochAt(ring.state.clock, head);
    if (lastEpoch.current !== null && lastEpoch.current !== e) void load();
    lastEpoch.current = e;
  }, [head, ring, load]);

  // ---- derived key-death strip
  const strip = useMemo(() => {
    if (!ring || head === null || head < ring.state.clock.genesisBlock) return null;
    const e = epochAt(ring.state.clock, head);
    const oldest = ring.state.keys[0];
    if (!oldest) return null;
    const death = keyDeathBlock(ring.state.clock, oldest.epoch);
    return { epoch: e, oldest: oldest.epoch, left: death - head, death };
  }, [ring, head]);

  // ---- writes
  async function guardWrite(what: string, fn: (wc: ArkivWriter, h: bigint) => Promise<any>) {
    const wc = w.writer();
    if (!wc) { w.openModal(); return; }
    setTx({ phase: "signing", what });
    try {
      const h = await reader.getBlockNumber({ cacheTime: 0 });
      const res: any = await fn(wc as unknown as ArkivWriter, h);
      setTx({ phase: "done", what, hash: res.txHash, key: res.entityKey ?? res.createdEntities?.join(", "), expiresAt: res.expiresAt?.toString() });
      void w.refreshBalance();
      setTimeout(() => void load(), 1500);
      return res;
    } catch (e: any) {
      const msg = e instanceof EpochTooLateError ? `${e.message}. Wait for the next epoch.` : (e?.shortMessage ?? e?.message ?? String(e)).slice(0, 320);
      setTx({ phase: "error", what, msg });
    }
  }

  async function doCreateCircle() {
    if (!w.account) return w.openModal();
    const h = await reader.getBlockNumber({ cacheTime: 0 });
    const id = hex16();
    const r = createDispatcherRing(id, h, BigInt(epochBlocks), w.account);
    const res = await guardWrite("Create circle", (wc) => createCircle(wc, id, r.state.clock));
    if (res) {
      await saveRing(r);
      setCircles(await listCircles());
      setCircle(id);
      setRing(r);
    }
  }
  const doPost = () => ring && guardWrite("Post ride", async (wc, h) => {
    const { epoch } = currentKey(advance(ring.state, h).state);
    return postRide(wc, advance(ring.state, h).state, h, epoch, { landmark: form.landmark, window: form.window, seats: form.seats, note: form.note }, form.zone);
  });
  const doClaim = (c: Card) => ring && guardWrite("Claim ride", (wc, h) =>
    claimRide(wc, ring.state, h, c.entity.key as Hex, c.epoch, { eta: "SYN-eta-15min", vehicle: "SYN-hatchback", ride: c.entity.key, by: w.account }));
  const doAssign = (c: Card, claimKey: string, closePrev?: Card) => ring && guardWrite("Assign claim", (wc, h) =>
    closePrev
      ? assignAndClosePrevious(wc, ring.state, h, { rideKey: c.entity.key as Hex, epoch: c.epoch, body: { claim: claimKey, instruction: "SYN-instruction: wait at the landmark, hazard lights on" } }, { rideKey: closePrev.entity.key as Hex, epoch: closePrev.epoch, body: { outcome: "SYN-done" } })
      : assignClaim(wc, ring.state, h, c.entity.key as Hex, c.epoch, { claim: claimKey, instruction: "SYN-instruction: wait at the landmark, hazard lights on" }));
  const doClose = (c: Card) => ring && guardWrite("Close out", (wc, h) => closeRide(wc, ring.state, h, c.entity.key as Hex, c.epoch, { outcome: "SYN-done" }));
  const doExtend = () => leaseUntil && guardWrite("Renew lease", (wc, h) => extendCircle(wc, leaseUntil.key, h, leaseUntil.expiresAt));

  // Failure button: a ride from a wallet that is not a trusted dispatcher, sealed under the stranger's own key.
  const doStranger = () => ring && guardWrite("Post as a stranger", async (wc, h) => {
    if (w.account && ring.dispatchers.map((d) => d.toLowerCase()).includes(w.account.toLowerCase())) throw new Error("This wallet is a trusted dispatcher. Connect a different wallet to forge.");
    const own = newChain(ring.state.circle, ring.state.clock);
    const st = advance(own, h).state;
    const { epoch } = currentKey(st);
    return postRide(wc, st, h, epoch, { landmark: "SYN-forged", window: "n/a", seats: 0, note: "SYN-forged ride" }, "SYN-zone-north");
  });
  async function doReplay() {
    const c = cards?.[0];
    if (!c || !ring) return setReplayMsg("Post a ride first, then replay its ciphertext.");
    const { value } = await readWithRelay((rc) => rc.select({ payload: true }).where(eq("$key", key(c.entity.key as Hex))).fetch()).catch(() => ({ value: null as any }));
    const payload = value?.entities?.[0]?.payload as Uint8Array | undefined;
    const ck = keyFor(ring.state, c.epoch);
    if (!payload || !ck) return setReplayMsg("Could not load that ride's ciphertext.");
    const wrong = await open(ck, { circle: ring.state.circle, epoch: c.epoch + 1n, type: "ride" }, payload);
    setReplayMsg(wrong.ok ? "UNEXPECTED: the replay opened." : `Refused (${wrong.reason}). The ciphertext is bound to epoch ${c.epoch.toString()} by its AAD, so it does not open in epoch ${(c.epoch + 1n).toString()}. No transaction was sent.`);
    void aad;
  }

  const asMore = (wc: ArkivWriter) => wc as unknown as MoreWriter;
  const doCancel = async (c: Card) => {
    if (!ring) return;
    const res = await guardWrite("Cancel ride", (wc) => cancelRide(asMore(wc), c.entity.key as Hex));
    if (res) {
      setCards((cs) => (cs ? cs.filter((x) => x.entity.key !== c.entity.key) : cs));
      setDeleteMsg(deleteNotice(keyDeathBlock(ring.state.clock, c.epoch)));
    }
  };
  const doWithdraw = async (c: Card, claimKey: string) => {
    if (!ring) return;
    const res = await guardWrite("Withdraw claim", (wc) => withdrawClaim(asMore(wc), claimKey as Hex));
    if (res) setDeleteMsg(deleteNotice(keyDeathBlock(ring.state.clock, c.epoch)));
  };
  async function doOpenNetwork() {
    if (!w.account) return w.openModal();
    const h0 = await reader.getBlockNumber({ cacheTime: 0 });
    const id = hex16();
    const r = createDispatcherRing(id, h0, BigInt(epochBlocks), w.account);
    r.gen = 1n;
    const res = await guardWrite("Open tonight's network", async (wc, h) => {
      const st = advance(r.state, h < r.state.clock.genesisBlock ? r.state.clock.genesisBlock : h).state;
      return openNetwork(asMore(wc), st, h, 0n, { landmark: form.landmark, window: form.window, seats: form.seats, note: form.note }, form.zone);
    });
    if (res) {
      await saveRing(r);
      setCircles(await listCircles());
      setCircle(id);
      setRing(r);
    }
  }
  async function doHandover() {
    if (!ring || !anchorInfo) return;
    if (!/^0x[0-9a-fA-F]{40}$/.test(handoverTo)) return setRekeyNote("Enter the morning dispatcher's wallet address (0x and 40 hex characters).");
    const h0 = await reader.getBlockNumber({ cacheTime: 0 });
    const res = await guardWrite("Hand over the network", (wc, h) => handOver(asMore(wc), advance(ring.state, h).state, h, epochAt(ring.state.clock, h), anchorInfo.key, handoverTo as Hex));
    if (res) setBanner(`Handed over at about block ${h0.toString()}: rides written by the previous holder after the handover no longer count.`);
  }
  const doTally = (epoch: bigint) => {
    if (!ring) return;
    const served = BigInt((cards ?? []).filter((c) => c.epoch === epoch && c.status === "closed").length);
    return guardWrite("Publish tally", (wc) => publishTally(asMore(wc), ring.state.circle, epoch, served));
  };
  const doExtendTally = (t: { key: Hex; expiresAt: bigint }) =>
    guardWrite("Keep tally alive", (wc, h) => extendTally(asMore(wc), t.key, h, t.expiresAt));

  const doPublishDevice = () => ring && guardWrite("Publish device key", async (wc, h) => {
    const dk = await ensureDeviceKey(ring.state.circle);
    return postMember(wc, ring.state.circle, dk.publicKey, epochAt(ring.state.clock, h));
  });
  async function doRekey() {
    if (!ring) return;
    const remaining = members.filter((m) => keepSet.has(m.creator.toLowerCase()) && isValidDeviceKey(m.pub)).map((m) => m.pub);
    if (ring.pending) return setRekeyNote("A rekey is already pending for epoch " + ring.pending.epoch.toString() + ". Wait for it to take effect.");
    const fresh = crypto.getRandomValues(new Uint8Array(32));
    const h0 = await reader.getBlockNumber({ cacheTime: 0 });
    const effect = epochAt(ring.state.clock, h0) + 1n;
    if (!anchorInfo) return setRekeyNote("The circle anchor has not loaded yet.");
    const nextGen = anchorInfo.gen + 1n;
    const res = await guardWrite("Rekey", (wc, h) => rekeyAndPatch(asMore(wc), ring.state, h, anchorInfo.key, effect, fresh, remaining, nextGen));
    if (res) {
      const next = { ...ring, gen: nextGen, pending: { epoch: effect, chainKey: fresh } };
      await saveRing(next);
      setRing(next);
      setRekeyNote(`Rekey posted in one transaction (rekey entity and circle generation ${nextGen.toString()}): the new chain starts at epoch ${effect.toString()} for ${remaining.length} remaining member(s). Removed members read nothing sealed from then on.`);
    }
  }

  async function showJoin() {
    if (!ring || head === null) return;
    const adv = (await advanceAndSave(ring, head)).ring;
    const url = `${window.location.origin}/join#${encodeJoin(adv)}`;
    setJoinQr({ url, png: await QRCode.toDataURL(url, { margin: 1, width: 240 }) });
  }
  async function drip() {
    if (!w.account) return;
    const r = await fetch("/api/drip", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: w.account }) });
    const j = await r.json();
    setTx(r.ok ? { phase: "done", what: "Test GLM drip", hash: j.hash } : { phase: "error", what: "Test GLM drip", msg: j.error });
    setTimeout(() => void w.refreshBalance(), 4000);
  }

  const surface = night ? { background: "var(--cobalt-deep)", color: "var(--on-cobalt)" } : {};
  const dying = erased && Date.now() - erased.at < 9000;
  return (
    <div style={{ ...surface, minHeight: "80vh" }}>
      {/* key-death strip */}
      <div role="status" aria-live="polite" style={{ position: "sticky", top: 68, zIndex: 40, background: dying ? "var(--exposed)" : "var(--cobalt-ink)", color: dying ? "#fff" : "var(--on-cobalt)", padding: "10px 0", transition: "background 220ms" }}>
        <div className="wrap mono" style={{ fontSize: 14, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "space-between" }}>
          <span>
            {dying
              ? `Key for epoch ${erased!.epochs.map(String).join(", ")} erased on this phone. ${erased!.count} record${erased!.count === 1 ? "" : "s"} now unreadable to everyone, here and on chain.`
              : strip ? `epoch ${strip.epoch.toString()} now · epoch ${strip.oldest.toString()} key dies in ${mmss(strip.left)} (block ${strip.death.toString()})` : "No circle loaded: key-death countdown starts when you open or create one."}
          </span>
          <span>{dyingSoon !== null ? `dies in the next 10 minutes: ${dyingSoon} ride${dyingSoon === 1 ? "" : "s"} · ` : ""}head {head?.toString() ?? "..."} · {live === "socket" ? "live socket" : live === "down" ? "socket unavailable, polling every 6 s" : "connecting"}</span>
        </div>
      </div>

      <div className="wrap" style={{ padding: "28px 16px 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <h1 className="story" style={{ fontSize: 44 }}>Board</h1>
          <label className="label" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={night} onChange={(e) => setNight(e.target.checked)} style={{ width: 18 }} /> Night dispatch
          </label>
        </div>

        {relayNote && <p className="notice" style={{ color: "var(--ink)" }}>{relayNote}</p>}
        {anchorInfo && timeline && timeline.changes.length > 0 && (
          <p className="notice" role="status" style={{ color: "var(--ink)" }}>
            Network held by <a className="hash" href={addrUrl(anchorInfo.owner)} target="_blank" rel="noreferrer">{anchorInfo.owner}</a>{handoverBlock ? ` since block ${handoverBlock.toString()}` : ""} (handed over by <a className="hash" href={addrUrl(anchorInfo.creator)} target="_blank" rel="noreferrer">{short(anchorInfo.creator, 6)}</a>). Rides written by an earlier holder after the handover do not count.
          </p>
        )}
        {anchorInfo && anchorInfo.gen > 1n && (
          <p className="notice" role="status" style={{ color: "var(--ink)" }}>Circle rekeyed{anchorInfo.updatedAt ? ` at block ${anchorInfo.updatedAt.toString()}` : ""}, generation {anchorInfo.gen.toString()}.</p>
        )}
        {banner && <p className="notice" role="status" style={{ color: "var(--ink)" }}>{banner}</p>}
        {deleteMsg && <p className="notice" role="status" style={{ color: "var(--ink)" }}>{deleteMsg}</p>}
        {error && <p className="notice err" role="alert">{error}</p>}

        <div className="grid g2" style={{ color: "var(--ink)", marginTop: 16 }}>
          <div className="card">
            <div className="mono" style={{ fontWeight: 700 }}>Wallet</div>
            {w.account ? (
              <p style={{ margin: "6px 0" }}>
                <a className="hash" href={addrUrl(w.account)} target="_blank" rel="noreferrer">{w.account}</a><br />
                <span className="mono">{fmtGlm(w.balance)} GLM</span>
              </p>
            ) : <p style={{ margin: "6px 0" }}>Not connected. Reading the board needs no wallet; writing does.</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!w.account && <button className="btn btn-ink" onClick={w.openModal}>Connect wallet</button>}
              {w.account && (w.balance ?? 0n) < 5_000_000_000_000_000n && <button className="btn btn-ink" onClick={drip}>Get test GLM</button>}
              <a className="btn" style={{ background: "var(--paper-2)", color: "var(--cobalt-ink)" }} href={FAUCET} target="_blank" rel="noreferrer">Hub faucet</a>
            </div>
          </div>
          <div className="card">
            <div className="mono" style={{ fontWeight: 700 }}>Circle</div>
            <select aria-label="Circle" value={circle} onChange={(e) => setCircle(e.target.value)} style={{ margin: "8px 0" }}>
              <option value="">{circles.length ? "Select a circle" : "No circle on this device"}</option>
              {circles.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select aria-label="Epoch length" value={epochBlocks} onChange={(e) => setEpochBlocks(e.target.value)} style={{ width: "auto" }}>
                <option value="300">demo: 300 blocks (10 min)</option>
                <option value="10800">production: 10,800 blocks (6 h)</option>
              </select>
              <button className="btn btn-ink" onClick={doCreateCircle}>Create circle</button>
              <button className="btn btn-lime" onClick={doOpenNetwork}>Open tonight's network</button>
              {isDispatcher && <button className="btn" style={{ background: "var(--paper-2)", color: "var(--cobalt-ink)" }} onClick={showJoin}>Show join QR</button>}
            </div>
            {leaseUntil && <p className="label" style={{ marginBottom: 0 }}>Network active until block {leaseUntil.expiresAt.toString()}. {isDispatcher && <button className="btn" style={{ padding: "2px 8px", fontSize: 12 }} onClick={doExtend}>Renew lease</button>}</p>}
            {ring && <p className="label" style={{ marginBottom: 0 }}>Role on this device: {ring.role}. Holder now: {holderNow ? short(holderNow, 4) : "..."}.</p>}
            {heldNetworks.length > 0 && <p className="label" style={{ marginBottom: 0 }}>Networks I hold: {heldNetworks.map((n) => n.slice(0, 8)).join(", ")}</p>}
          </div>
        </div>

        {joinQr && (
          <div className="card" style={{ color: "var(--ink)", marginTop: 20, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
            <img src={joinQr.png} alt="QR code for the join link" width={200} height={200} />
            <div style={{ flex: 1, minWidth: 240 }}>
              <div className="mono" style={{ fontWeight: 700 }}>Join link</div>
              <p className="notice err" style={{ margin: "8px 0" }}>Hand this over in person. It carries the key for this epoch and every later one, and it cannot open anything older.</p>
              <div className="hash" style={{ maxHeight: 80, overflow: "auto" }}>{joinQr.url}</div>
            </div>
          </div>
        )}

        {tx.phase !== "idle" && (
          <div role="status" className={`notice ${tx.phase === "error" ? "err" : ""}`} style={{ marginTop: 20, color: tx.phase === "error" ? undefined : "var(--ink)" }}>
            {tx.phase === "signing" && <>{tx.what}: waiting for your wallet to sign...</>}
            {tx.phase === "error" && <>{tx.what} failed: {tx.msg}</>}
            {tx.phase === "done" && (
              <>
                {tx.what} confirmed. <a className="hash" href={txUrl(tx.hash)} target="_blank" rel="noreferrer">{tx.hash}</a>
                {tx.key && <> · entity {short(String(tx.key), 8)}</>}
                {tx.expiresAt && <> · Entity Expiration at block {tx.expiresAt}</>}
              </>
            )}
          </div>
        )}

        {ring && isDispatcher && (
          <div className="card" style={{ color: "var(--ink)", marginTop: 20 }}>
            <div className="mono" style={{ fontWeight: 700, marginBottom: 8 }}>Post a ride (synthetic data only)</div>
            <div className="grid g3" style={{ gap: 12 }}>
              <label className="label">Landmark<select value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })}>{LANDMARKS.map((l) => <option key={l}>{l}</option>)}</select></label>
              <label className="label">Zone<select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>{ZONES.map((l) => <option key={l}>{l}</option>)}</select></label>
              <label className="label">Window<select value={form.window} onChange={(e) => setForm({ ...form, window: e.target.value })}>{WINDOWS.map((l) => <option key={l}>{l}</option>)}</select></label>
              <label className="label">Seats<input type="number" min={1} max={6} value={form.seats} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} /></label>
              <label className="label" style={{ gridColumn: "span 2" }}>Note<input value={form.note} maxLength={120} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            </div>
            <button className="btn btn-lime" style={{ marginTop: 12 }} onClick={doPost}>Post ride (wallet popup)</button>
          </div>
        )}

        {ring && isDispatcher && (
          <div className="card" style={{ color: "var(--ink)", marginTop: 20 }}>
            <div className="mono" style={{ fontWeight: 700 }}>Shift handover</div>
            <p className="label">Hand the network to the morning dispatcher in one transaction (changeOwnership plus a sealed handover record). From that block, rides written by you no longer count. The morning dispatcher should join with a join link first so they hold the keys.</p>
            <input aria-label="Morning dispatcher wallet" placeholder="0x... morning dispatcher wallet" value={handoverTo} onChange={(e) => setHandoverTo(e.target.value.trim())} />
            <button className="btn btn-ink" style={{ marginTop: 10 }} onClick={doHandover}>Hand over (wallet popup)</button>
          </div>
        )}

        {ring && (
          <div className="card" style={{ color: "var(--ink)", marginTop: 20 }}>
            <div className="mono" style={{ fontWeight: 700 }}>Service record (tallies)</div>
            <p className="label">One count per closed epoch, signed by the dispatcher, with no person, place or time finer than an epoch. Anyone with a wallet, such as a funder, can extend a tally without owning it. Rides refuse that on purpose.</p>
            {tallies.length === 0 && <p className="label">No tally published yet.</p>}
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {tallies.map((t) => (
                <li key={t.key} className="label" style={{ marginBottom: 6 }}>
                  epoch {t.epoch.toString()}: {t.served.toString()} ride{t.served === 1n ? "" : "s"} served · written by {short(t.creator, 4)} · held by {short(t.owner, 4)} · lives until block {t.expiresAt.toString()}{" "}
                  {!isDispatcher && <button className="btn" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => doExtendTally(t)}>Keep alive (wallet popup)</button>}
                </li>
              ))}
            </ul>
            {isDispatcher && strip && <button className="btn btn-ink" onClick={() => doTally(strip.epoch > 0n ? strip.epoch - 1n : 0n)}>Publish tally for epoch {(strip.epoch > 0n ? strip.epoch - 1n : 0n).toString()} (wallet popup)</button>}
          </div>
        )}

        {ring && (
          <div className="card" style={{ color: "var(--ink)", marginTop: 20 }}>
            <div className="mono" style={{ fontWeight: 700 }}>Rekey: recover from a lost phone</div>
            {rekeyNote && <p className="notice" role="status">{rekeyNote}</p>}
            {ring.role === "member" ? (
              <>
                <p className="label">Publish a device key (generated here, not your wallet key) so the dispatcher can seal a new chain key to this phone if a rekey is needed.</p>
                <button className="btn btn-ink" onClick={doPublishDevice}>Publish my device key (wallet popup)</button>
                {ring.pending && <p className="label">Pending rekey for epoch {ring.pending.epoch.toString()}.</p>}
              </>
            ) : (
              <>
                <p className="label">Wallets that published a device key. Tick only the members you recognise and want to keep, then rekey. The new chain is sealed only to the ticked wallets, so a removed or unknown wallet gets nothing.</p>
                {members.length === 0 && <p className="label">No member has published a device key yet.</p>}
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {members.map((m) => (
                    <li key={m.creator}>
                      <label className="label" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                        <input type="checkbox" style={{ width: 18 }} checked={keepSet.has(m.creator.toLowerCase())}
                          onChange={(e) => { const n = new Set(keepSet); if (e.target.checked) n.add(m.creator.toLowerCase()); else n.delete(m.creator.toLowerCase()); setKeepSet(n); }} />
                        keep {m.creator}
                      </label>
                    </li>
                  ))}
                </ul>
                <button className="btn btn-ink" style={{ marginTop: 10 }} disabled={!isDispatcher} onClick={doRekey}>Rekey now (wallet popup)</button>
                {ring.pending && <p className="label">Pending: new chain starts at epoch {ring.pending.epoch.toString()}.</p>}
              </>
            )}
          </div>
        )}

        {ring && (
          <div style={{ marginTop: 28 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <h2 className="story" style={{ fontSize: 32 }}>Open rides</h2>
              {myClaims !== null && <span className="chip">your live claims: {myClaims}</span>}
              <label className="label" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>Zone filter (blind tag)
                <select value={zone} onChange={(e) => setZone(e.target.value)} style={{ width: "auto" }}>
                  <option value="">all zones</option>
                  {ZONES.map((z) => <option key={z}>{z}</option>)}
                </select>
              </label>
            </div>
            {cards === null && <div className="skeleton" style={{ height: 150, marginTop: 12 }} />}
            {cards && cards.length === 0 && <p className="notice" style={{ color: "var(--ink)" }}>No live rides in the current or grace epoch.</p>}
            <div className="grid g3" style={{ marginTop: 12, color: "var(--ink)" }}>
              <AnimatePresence>
                {cards?.map((c) => {
                  const prev = cards.find((p) => p.status === "assigned" && p.entity.key !== c.entity.key);
                  return (
                    <motion.div key={c.entity.key} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, filter: "blur(6px)", clipPath: "inset(0 0 0 100%)", transition: { duration: 0.9 } }}>
                      <div className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span className="chip sealed">sealed · epoch {c.epoch.toString()}</span>
                          <span className="chip">{c.status}</span>
                        </div>
                        {c.body ? (
                          <div style={{ margin: "10px 0" }}>
                            <div className="mono" style={{ fontWeight: 700 }}>{c.body.landmark}</div>
                            <div>{c.body.window} · {c.body.seats} seat{c.body.seats === 1 ? "" : "s"}</div>
                            <div className="label">{c.body.note}</div>
                          </div>
                        ) : <p className="label">This device holds no key for epoch {c.epoch.toString()}, so the contents stay sealed here.</p>}
                        <div className="label">Fixed since creation (readonly) · dies at block {c.entity.expiresAt.toString()}</div>
                        <div className="label"><a href={dataExplorerKey(c.entity.key)} target="_blank" rel="noreferrer">Open in Arkiv Data Explorer</a></div>
                        <div className="label">written by ($creator) <a href={addrUrl(c.entity.creator)} target="_blank" rel="noreferrer">{short(c.entity.creator, 4)}</a> · held by ($owner) <a href={addrUrl(c.entity.owner)} target="_blank" rel="noreferrer">{short(c.entity.owner, 4)}</a></div>
                        {isDispatcher && c.claims.map((cl) => (
                          <div key={cl.entity.key} style={{ marginTop: 8, padding: 8, border: "1.5px solid var(--cobalt-ink)", borderRadius: 8 }}>
                            <div className="label">claim by {short(cl.entity.creator, 4)} · {cl.body?.eta} · {cl.body?.vehicle}</div>
                            {c.status !== "assigned" && c.status !== "closed" && <button className="btn btn-ink" style={{ padding: "4px 10px" }} onClick={() => doAssign(c, cl.entity.key, prev)}>{prev ? "Assign + close previous" : "Assign"}</button>}
                          </div>
                        ))}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                          {!isDispatcher && c.status !== "closed" && c.body && <button className="btn btn-ink" onClick={() => doClaim(c)}>Claim (wallet popup)</button>}
                          {isDispatcher && c.status === "assigned" && <button className="btn btn-ink" onClick={() => doClose(c)}>Close out</button>}
                          {isDispatcher && (c.status === "open" || c.status === "claimed") && <button className="btn" style={{ background: "var(--paper-2)", color: "var(--cobalt-ink)" }} onClick={() => doCancel(c)}>Cancel ride</button>}
                          {!isDispatcher && c.claims.filter((cl) => cl.entity.creator.toLowerCase() === (w.account ?? "").toLowerCase()).map((cl) => (
                            <button key={cl.entity.key} className="btn" style={{ background: "var(--paper-2)", color: "var(--cobalt-ink)" }} onClick={() => doWithdraw(c, cl.entity.key)}>Withdraw claim</button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <div className="card" style={{ marginTop: 28, color: "var(--ink)" }}>
              <div className="mono" style={{ fontWeight: 700 }}>Ignored: not written by a trusted dispatcher</div>
              <p className="label">Rides and assignments here exist on Arkiv but do not count, because their $creator is not the trusted wallet. Trust comes from $creator, never from an attribute anyone can write.</p>
              {ignoredRides.length === 0 && ignoredAssigns.length === 0 && <p className="label">Nothing ignored right now.</p>}
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {ignoredRides.map((e) => <li key={e.key} className="hash">forged ride {short(e.key, 8)} · creator <a href={addrUrl(e.creator)}>{e.creator}</a></li>)}
                {ignoredAssigns.map((e) => <li key={e.key} className="hash">forged assignment {short(e.key, 8)} · creator <a href={addrUrl(e.creator)}>{e.creator}</a></li>)}
              </ul>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button className="btn btn-ink" onClick={doStranger}>Post as a stranger</button>
                <button className="btn" style={{ background: "var(--paper-2)", color: "var(--cobalt-ink)" }} onClick={doReplay}>Replay a ciphertext into this epoch</button>
              </div>
              {replayMsg && <p className="notice" role="status" style={{ marginTop: 10 }}>{replayMsg}</p>}
            </div>
          </div>
        )}
        {!ring && DEMO_CIRCLE && <DemoView />}
        {!ring && <p className="notice" style={{ color: "var(--ink)", marginTop: 24 }}>No circle on this device yet. A dispatcher can create one above; a volunteer opens a join link from the dispatcher, in person.</p>}
      </div>
    </div>
  );
}
void ([] as EntityType[]);
