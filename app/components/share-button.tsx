"use client";
import { useState } from "react";
export function ShareButton({ id }: { id: string }) {
  const [message, setMessage] = useState("");
  return <><button className="text-button" onClick={async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/captions/${id}`); setMessage("Link copied"); }
    catch { setMessage("Open the caption and copy its address to share."); }
  }}>Copy link</button><span className="share-status" role="status">{message}</span></>;
}
