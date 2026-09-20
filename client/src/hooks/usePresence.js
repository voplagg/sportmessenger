import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import api from "../api";

/**
 * Hook haldab kasutaja kohalolu (online/offline) Redis kaudu.
 * Ootab, kuni Firebase Auth on täielikult valmis, siis märgib online'iks.
 */
export function usePresence(user) {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    let heartbeatInterval;
    let fetchInterval;
    let started = false;

    const goOnline = async () => {
      try {
        console.log("📡 Sending goOnline...");
        const res = await api.post("/presence/online");
        console.log("✅ goOnline response:", res.data);
      } catch (err) {
        console.error("❌ goOnline error:", err.message);
      }
    };

    const heartbeat = async () => {
      try {
        await api.post("/presence/heartbeat");
      } catch (err) {
        // vaikselt
      }
    };

    const fetchOnline = async () => {
      try {
        const { data } = await api.get("/presence/online");
        console.log("📥 fetchOnline:", data);
        if (!cancelled) {
          setOnlineUsers(data.users || []);
        }
      } catch (err) {
        console.error("❌ fetchOnline error:", err.message);
      }
    };

    // Ootame, kuni Firebase Auth on valmis
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser || cancelled || started) return;
      started = true;

      console.log("🔐 Firebase user ready:", firebaseUser.uid);

      // Väike viivitus, et token oleks kindlasti valmis
      await new Promise((r) => setTimeout(r, 500));

      await goOnline();
      await fetchOnline();

      heartbeatInterval = setInterval(heartbeat, 30_000);
      fetchInterval = setInterval(fetchOnline, 5_000);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(heartbeatInterval);
      clearInterval(fetchInterval);
      api.post("/presence/offline").catch(() => {});
    };
  }, [user]);

  return onlineUsers;
}