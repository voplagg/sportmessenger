import { useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase";
import { usePresence } from "../hooks/usePresence";

const CHANNELS = [
  { id: "general", label: "üldine", emoji: "💬" },
  { id: "football", label: "jalgpall", emoji: "⚽" },
  { id: "basketball", label: "korvpall", emoji: "🏀" },
  { id: "running", label: "jooksmine", emoji: "🏃" },
  { id: "cycling", label: "jalgrattasõit", emoji: "🚴" },
  { id: "swimming", label: "ujumine", emoji: "🏊" },
];

export default function Chat({ user }) {
  const [channel, setChannel] = useState("general");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("channels");
  const bottomRef = useRef(null);

  const onlineUsers = usePresence(user);

  useEffect(() => {
    const q = query(
      collection(db, "messages"),
      where("channel", "==", channel),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [channel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await addDoc(collection(db, "messages"), {
        text: trimmed,
        channel: channel,
        uid: user.uid,
        name: user.displayName || user.email,
        photo: user.photoURL || "",
        createdAt: serverTimestamp(),
      });
      setText("");
    } catch (err) {
      console.error("Saatmise viga:", err);
      alert("Saatmine ebaõnnestus: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Kas soovid välja logida?")) {
      signOut(auth);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp?.toDate) return "";
    const d = timestamp.toDate();
    return d.toLocaleTimeString("et-EE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="chat-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>🏆 Sport</h1>
          <p>Messenger</p>
        </div>

        <div className="sidebar-tabs">
          <button
            className={activeTab === "channels" ? "active" : ""}
            onClick={() => setActiveTab("channels")}
          >
            Kanalid
          </button>
          <button
            className={activeTab === "online" ? "active" : ""}
            onClick={() => setActiveTab("online")}
          >
            🟢 Online ({onlineUsers.length})
          </button>
        </div>

        <div className="sidebar-section">
          {activeTab === "channels" && (
            <nav>
              {CHANNELS.map((c) => (
                <button
                  key={c.id}
                  className={`channel-btn ${channel === c.id ? "active" : ""}`}
                  onClick={() => setChannel(c.id)}
                >
                  <span>{c.emoji}</span>
                  <span>#{c.label}</span>
                </button>
              ))}
            </nav>
          )}

          {activeTab === "online" && (
            <div className="online-list">
              {onlineUsers.length === 0 && (
                <p className="empty-online">Hetkel pole kedagi online</p>
              )}
              {onlineUsers.map((u) => (
                <div key={u.uid} className="online-item">
                  <img
                    src={u.photo || "https://via.placeholder.com/32"}
                    alt=""
                  />
                  <div>
                    <div className="online-name">{u.name}</div>
                    <div className="online-status">🟢 online</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sidebar-user">
          <img
            src={user.photoURL || "https://via.placeholder.com/40"}
            alt="avatar"
          />
          <div>
            <div className="user-name">{user.displayName || "Kasutaja"}</div>
            <button className="logout-btn" onClick={handleLogout}>
              Logi välja
            </button>
          </div>
        </div>
      </aside>

      <main className="chat-main">
        <header className="chat-header">
          <h2>
            {CHANNELS.find((c) => c.id === channel)?.emoji}{" "}
            #{CHANNELS.find((c) => c.id === channel)?.label}
          </h2>
          <span className="msg-count">
            {messages.length}{" "}
            {messages.length === 1 ? "sõnum" : "sõnumit"}
          </span>
        </header>

        <div className="messages">
          {messages.length === 0 && (
            <div className="empty-state">
              <p>Kanali #{channel} all pole veel sõnumeid</p>
              <p>Kirjuta esimesena! 👇</p>
            </div>
          )}

          {messages.map((m, i) => {
            const isOwn = m.uid === user.uid;
            const prev = messages[i - 1];
            const showHeader = !prev || prev.uid !== m.uid;

            return (
              <div
                key={m.id}
                className={`message ${isOwn ? "own" : ""} ${
                  showHeader ? "with-header" : ""
                }`}
              >
                {showHeader && (
                  <img
                    className="msg-avatar"
                    src={m.photo || "https://via.placeholder.com/40"}
                    alt=""
                  />
                )}
                {!showHeader && <div className="msg-avatar-spacer" />}

                <div className="msg-content">
                  {showHeader && (
                    <div className="msg-meta">
                      <span className="msg-author">{m.name}</span>
                      <span className="msg-time">
                        {formatTime(m.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className="msg-text">{m.text}</div>
                </div>
              </div>
            );
          })}

          <div ref={bottomRef} />
        </div>

        <form className="message-form" onSubmit={handleSend}>
          <input
            type="text"
            placeholder={`Kirjuta kanalisse #${channel}...`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={sending}
            maxLength={10}
            autoFocus
          />
          <button type="submit" disabled={!text.trim() || sending}>
            {sending ? "..." : "Saada"}
          </button>
        </form>
      </main>
    </div>
  );
}