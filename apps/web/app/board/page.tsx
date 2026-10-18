import { Suspense } from "react";
import { BoardClient } from "@/components/board/BoardClient";

export default function BoardPage() {
  return (
    <Suspense fallback={<div className="wrap" style={{ padding: 40 }}><div className="skeleton" style={{ height: 200 }} /></div>}>
      <BoardClient />
    </Suspense>
  );
}
