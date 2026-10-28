import { useEffect, useRef, useState } from "react";
import { useRoom } from "../context/RoomContext";
import RoleBadge from "./RoleBadge";

const MAX_LENGTH = 300;

function clock(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chat() {
  const { messages, myUserId, sendMessage } = useRoom();
  const [text, setText] = useState("");
  const listRef = useRef(null);

  // Scroll the chat box (not the whole page) to the newest message
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function handleSubmit(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    sendMessage(value);
    setText("");
  }

  return (
    <section className="panel chat">
      <h3 className="panel-title">Chat</h3>

      <div className="chat-list" ref={listRef}>
        {messages.length === 0 && <p className="muted small">No messages yet. Say hi!</p>}

        {messages.map((m) => {
          const mine = m.userId === myUserId;
          return (
            <div key={m.id} className={`msg ${mine ? "msg-mine" : ""}`}>
              <div className="msg-head">
                <span className="msg-name">{mine ? "You" : m.username}</span>
                {m.role !== "participant" && <RoleBadge role={m.role} />}
                <span className="msg-time">{clock(m.createdAt)}</span>
              </div>
              {/* React escapes the text, so <script> in a message is shown as plain text */}
              <div className="msg-text">{m.text}</div>
            </div>
          );
        })}
      </div>

      <form className="row" onSubmit={handleSubmit}>
        <input
          className="input"
          placeholder="Type a message"
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          Send
        </button>
      </form>
    </section>
  );
}