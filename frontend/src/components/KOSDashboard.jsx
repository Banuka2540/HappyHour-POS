import { useEffect, useRef, useState } from "react";
import { G, ORDER_API_BASE_URL } from "../utils/constants";

const KOS_ALARM_KEY = "happy-hour-kos-alarm-enabled";

const getApiBase = () => {
  if (typeof window === "undefined") {
    return ORDER_API_BASE_URL;
  }

  const configured = (ORDER_API_BASE_URL || "").trim();
  const host = window.location.hostname;

  if (configured && !/^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(configured)) {
    return configured.replace(/\/+$/, "");
  }

  if (host && !/^(localhost|127\.0\.0\.1)$/i.test(host)) {
    return window.location.origin;
  }

  return configured || "http://localhost:4242";
};

const formatPrice = (value) => `Rs. ${Number(value || 0).toLocaleString("en", { minimumFractionDigits: 2 })}`;

const playAlarmTone = (audioContextRef) => {
  const audioContext = audioContextRef.current;
  if (!audioContext) return;

  const now = audioContext.currentTime;
  const gain = audioContext.createGain();
  const oscillator = audioContext.createOscillator();

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(880, now);
  oscillator.frequency.setValueAtTime(660, now + 0.22);
  oscillator.frequency.setValueAtTime(920, now + 0.44);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.6, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.8);
};

export function KOSDashboard({ onBackToPos, onOpenAdmin }) {
  const [tickets, setTickets] = useState([]);
  const [connectionState, setConnectionState] = useState("Connecting");
  const [alarmEnabled, setAlarmEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem(KOS_ALARM_KEY);
    return stored === null ? true : stored === "true";
  });
  const [flashTicketId, setFlashTicketId] = useState("");
  const [finishingTicketId, setFinishingTicketId] = useState("");
  const [notice, setNotice] = useState("Waiting for incoming kitchen orders...");
  const audioContextRef = useRef(null);
  const alarmEnabledRef = useRef(false);
  const flashTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KOS_ALARM_KEY, alarmEnabled ? "true" : "false");
  }, [alarmEnabled]);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const response = await fetch(`${getApiBase()}/api/kos/orders`);
        if (!response.ok) {
          throw new Error("Unable to load kitchen feed");
        }

        const payload = await response.json();
        setTickets(Array.isArray(payload.orders) ? payload.orders : []);
        setConnectionState("Live");
        setNotice(payload.orders?.length ? "Kitchen feed ready" : "Waiting for incoming kitchen orders...");
      } catch (error) {
        setConnectionState("Offline");
        setNotice(error instanceof Error ? error.message : "Unable to connect to kitchen feed");
      }
    };

    void loadTickets();

    const source = new EventSource(`${getApiBase()}/api/kos/stream`);

    source.addEventListener("ready", () => {
      setConnectionState("Live");
    });

    source.addEventListener("order", (event) => {
      const ticket = JSON.parse(event.data);
      setTickets((prev) => [ticket, ...prev.filter((item) => item.ticketId !== ticket.ticketId)].slice(0, 100));
      setFlashTicketId(ticket.ticketId);
      setNotice(`New order received: ${ticket.orderNumber}`);

      if (alarmEnabledRef.current) {
        playAlarmTone(audioContextRef);
        if (navigator.vibrate) {
          navigator.vibrate([160, 80, 160]);
        }
        if (window.Notification && window.Notification.permission === "granted") {
          new Notification("New kitchen order received", { body: `Order ${ticket.orderNumber} is ready for prep.` });
        }
      }

      if (flashTimerRef.current) {
        window.clearTimeout(flashTimerRef.current);
      }
      flashTimerRef.current = window.setTimeout(() => setFlashTicketId(""), 1200);
    });

    source.addEventListener("orderCompleted", (event) => {
      const payload = JSON.parse(event.data);
      setTickets((prev) => prev.filter((item) => item.ticketId !== payload.ticketId));
      setNotice(`Ticket finished: ${payload.ticketId}`);
    });

    source.onerror = () => {
      setConnectionState("Reconnecting");
      setNotice("Connection lost. Retrying live feed...");
    };

    return () => {
      source.close();
      if (flashTimerRef.current) {
        window.clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  const prepareAlarmContext = async () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        setNotice("Audio alarms are not supported in this browser.");
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      if (audioContextRef.current.state !== "running") {
        await audioContextRef.current.resume();
      }
    } catch {
      setNotice("Unable to enable alarm sound.");
    }
  };

  const enableAlarm = async () => {
    setAlarmEnabled(true);

    if (window.Notification && window.Notification.permission === "default") {
      await window.Notification.requestPermission();
    }
  };

  useEffect(() => {
    const unlockAlarm = () => {
      alarmEnabledRef.current = true;
      void prepareAlarmContext();
    };

    window.addEventListener("pointerdown", unlockAlarm, { once: true });
    window.addEventListener("touchstart", unlockAlarm, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAlarm);
      window.removeEventListener("touchstart", unlockAlarm);
    };
  }, []);

  const finishTicket = async (ticketId) => {
    if (!ticketId || finishingTicketId === ticketId) return;

    setFinishingTicketId(ticketId);
    try {
      const response = await fetch(`${getApiBase()}/api/kos/orders/${encodeURIComponent(ticketId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to finish ticket");
      }

      setTickets((prev) => prev.filter((ticket) => ticket.ticketId !== ticketId));
      setNotice(`Finished ticket ${ticketId}`);
    } catch {
      setNotice("Unable to finish ticket right now.");
    } finally {
      setFinishingTicketId("");
    }
  };

  useEffect(() => {
    alarmEnabledRef.current = alarmEnabled;
    if (alarmEnabled) {
      setNotice("Alarm enabled for new kitchen orders.");
      void prepareAlarmContext();
    }
  }, [alarmEnabled]);

  return (
    <div className="kos-shell">
      <div className="kos-hero">
        <div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700, color: G.gold }}>Kitchen Order System</div>
          <div style={{ color: G.muted, fontSize: 13 }}>Live chef feed for billed POS orders</div>
        </div>
        <div className="kos-actions">
          <button onClick={enableAlarm} style={{
            padding: "10px 14px", borderRadius: 10, border: "none",
            background: alarmEnabled ? "#2D7C4A" : `linear-gradient(135deg,${G.gold},#B8880E)`,
            color: alarmEnabled ? "#fff" : G.dark, fontWeight: 700, cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif"
          }}>
            {alarmEnabled ? "Alarm Enabled" : "Enable Alarm"}
          </button>
          <button onClick={onOpenAdmin} style={{
            padding: "10px 14px", borderRadius: 10, border: `1px solid ${G.border}`,
            background: G.dark3, color: G.text, fontWeight: 700, cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif"
          }}>
            Open Admin
          </button>
          <button onClick={onBackToPos} style={{
            padding: "10px 14px", borderRadius: 10, border: `1px solid ${G.border}`,
            background: G.dark3, color: G.text, fontWeight: 700, cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif"
          }}>
            Back to POS
          </button>
        </div>
      </div>

      <div className="kos-stats">
        <div className="kos-stat" style={{ minWidth: 200 }}>
          <div style={{ color: G.muted, fontSize: 12 }}>Connection</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: connectionState === "Live" ? G.success : G.gold }}>{connectionState}</div>
        </div>
        <div className="kos-stat" style={{ minWidth: 260, flex: 1 }}>
          <div style={{ color: G.muted, fontSize: 12 }}>Status</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{notice}</div>
        </div>
        <div className="kos-stat" style={{ minWidth: 180 }}>
          <div style={{ color: G.muted, fontSize: 12 }}>Tickets waiting</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: G.gold }}>{tickets.length}</div>
        </div>
      </div>

      <div className="kos-grid">
        {tickets.length === 0 ? (
          <div style={{
            gridColumn: "1 / -1", background: G.dark2, border: `1px dashed ${G.border}`,
            borderRadius: 18, padding: 28, color: G.muted, textAlign: "center"
          }}>
            No kitchen tickets yet.
          </div>
        ) : tickets.map((ticket) => (
          <div key={ticket.ticketId} className="kos-ticket" style={{
            background: ticket.ticketId === flashTicketId ? "linear-gradient(180deg, rgba(212,160,23,0.22), rgba(42,29,14,1))" : G.dark2,
            border: `1px solid ${ticket.ticketId === flashTicketId ? G.gold : G.border}`,
            borderRadius: 18, padding: 18, boxShadow: ticket.ticketId === flashTicketId ? "0 0 0 1px rgba(212,160,23,0.3), 0 0 30px rgba(212,160,23,0.18)" : "none",
            animation: ticket.ticketId === flashTicketId ? "kosPulse 1.2s ease-in-out" : "none"
          }}>
            <div className="kos-ticket-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12 }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: G.gold }}>
                Order #{ticket.orderNumber}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <div style={{ fontSize: 12, color: G.muted }}>Live</div>
                <button
                  onClick={() => finishTicket(ticket.ticketId)}
                  disabled={finishingTicketId === ticket.ticketId}
                  className="kos-finish-btn"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "none",
                    background: finishingTicketId === ticket.ticketId ? G.dark3 : "linear-gradient(135deg,#2D7C4A,#1F5E38)",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: finishingTicketId === ticket.ticketId ? "not-allowed" : "pointer",
                    fontFamily: "'DM Sans',sans-serif",
                    minHeight: 44,
                  }}
                >
                  {finishingTicketId === ticket.ticketId ? "Finishing..." : "Finish"}
                </button>
              </div>
            </div>

            <div className="kos-ticket-head">
              <span>Product Name</span>
              <span>Qty</span>
              <span>Item Price</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {ticket.items.map((item, index) => (
                <div key={`${ticket.ticketId}-${index}`} className="kos-ticket-row">
                  <div style={{ fontSize: 15, fontWeight: 700, color: G.text }}>{item.productName}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: G.text }}>{item.quantity}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: G.gold }}>{formatPrice(item.itemPrice)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes kosPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.01); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}