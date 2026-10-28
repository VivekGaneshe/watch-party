import { useState } from "react";

export default function InviteButton({ roomId }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/room/${roomId}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("Copy this link:", link); // fallback if clipboard is blocked
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button className="btn btn-small" onClick={handleCopy}>
      {copied ? "Copied!" : "Copy invite link"}
    </button>
  );
}