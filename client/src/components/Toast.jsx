import { useEffect } from "react";
import { useRoom } from "../context/RoomContext";

export default function Toast() {
  const { notice, clearNotice } = useRoom();

  // Restart the 4s timer only when a NEW notice arrives
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(clearNotice, 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice?.id]);

  if (!notice) return null;

  return (
    <div className={`toast toast-${notice.kind}`} role="status" onClick={clearNotice}>
      {notice.text}
    </div>
  );
}