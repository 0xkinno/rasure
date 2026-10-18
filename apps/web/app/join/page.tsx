"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decodeJoin, joinRing, saveRing } from "@/lib/keyring";
import { advanceAndSave } from "@/lib/keyring";
import { readWithRelay } from "@/lib/chain";

/** Reads the join fragment, stores the key ring in IndexedDB, then strips the fragment from the address bar. */
export default function Join() {
  const router = useRouter();
  const [msg, setMsg] = useState("Reading the join link...");
  const [bad, setBad] = useState(false);
  useEffect(() => {
    (async () => {
      const j = decodeJoin(window.location.hash);
      if (!j) { setBad(true); setMsg("This link carries no valid circle key. Ask the dispatcher for a new one, in person."); return; }
      history.replaceState(null, "", window.location.pathname); // fragment gone from the address bar
      try {
        const ring = joinRing(j.circle, j.genesisBlock, j.epochBlocks, j.epoch, j.chainKey, j.dispatchers);
        await saveRing(ring);
        const { value: head } = await readWithRelay((c) => c.getBlockNumber({ cacheTime: 0 }));
        await advanceAndSave(ring, head);
        setMsg("Joined. The key is stored on this device only. Opening the board...");
        setTimeout(() => router.replace(`/board?circle=${j.circle}`), 700);
      } catch (e) { setBad(true); setMsg((e as Error).message.slice(0, 250)); }
    })();
  }, [router]);
  return (
    <div className="wrap" style={{ padding: "80px 16px", minHeight: "60vh" }}>
      <h1 className="story">Join a circle</h1>
      <p className={bad ? "notice err" : "notice"} role="status">{msg}</p>
      <p className="label">A join link carries the key for one epoch and every later one. It cannot open anything older. Hand it over in person.</p>
    </div>
  );
}
