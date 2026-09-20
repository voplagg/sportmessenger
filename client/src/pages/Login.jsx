import { useState } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    try {
      setError("");
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Google sisselogimise viga:", err);
      setError(tõlgiViga(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        if (name.trim().length < 2) {
          throw new Error("Nimi peab olema vähemalt 2 tähemärki");
        }
        if (password.length < 6) {
          throw new Error("Parool peab olema vähemalt 6 tähemärki");
        }

        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Обновляем профиль — добавляем имя
        await updateProfile(cred.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error("Email auth viga:", err);
      setError(err.message.includes("vähemalt") ? err.message : tõlgiViga(err.code));
    } finally {
      setLoading(false);
    }
  };

  const tõlgiViga = (code) => {
    const errors = {
      "auth/email-already-in-use": "See e-post on juba kasutusel",
      "auth/invalid-email": "Vigane e-posti aadress",
      "auth/weak-password": "Parool on liiga nõrk (vähemalt 6 tähemärki)",
      "auth/user-not-found": "Kasutajat ei leitud",
      "auth/wrong-password": "Vale parool",
      "auth/invalid-credential": "Vale e-post või parool",
      "auth/too-many-requests": "Liiga palju katseid. Proovi hiljem uuesti",
      "auth/popup-closed-by-user": "Aken suleti enne lõpetamist",
      "auth/network-request-failed": "Võrgu viga. Kontrolli internetiühendust",
    };
    return errors[code] || "Midagi läks valesti. Proovi uuesti";
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError("");
    setPassword("");
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>🏆 Sport Messenger</h1>
        <p>Suhtle sportlastega üle maailma</p>

        {/* Переключатель Вход / Регистрация */}
        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Logi sisse
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Registreeru
          </button>
        </div>

        {/* Форма email/пароль */}
        <form onSubmit={handleEmailAuth} className="auth-form">
          {mode === "register" && (
            <input
              type="text"
              placeholder="Sinu nimi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              disabled={loading}
            />
          )}

          <input
            type="email"
            placeholder="E-post"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <input
            type="password"
            placeholder="Parool"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
          />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? "Palun oota..."
              : mode === "login"
              ? "Logi sisse"
              : "Loo konto"}
          </button>
        </form>

        {/* Разделитель */}
        <div className="auth-divider">
          <span>või</span>
        </div>

        {/* Google */}
        <button onClick={handleGoogle} className="google-btn" disabled={loading}>
          <span>🔵</span> {mode === "login" ? "Logi sisse" : "Registreeru"} Google'iga
        </button>

        {/* Переключение режима */}
        <p className="auth-switch">
          {mode === "login" ? (
            <>
              Pole kontot?{" "}
              <button type="button" onClick={switchMode}>
                Registreeru
              </button>
            </>
          ) : (
            <>
              On juba konto?{" "}
              <button type="button" onClick={switchMode}>
                Logi sisse
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}