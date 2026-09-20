import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export default function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sisselogimise viga:", error);
      alert("Sisselogimine ebaõnnestus: " + error.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Sport Messenger</h1>
        <p>Suhtle sportlastega üle maailma</p>
        <button onClick={handleLogin} className="google-btn">
          <span>🔵</span> Logi sisse Google'iga
        </button>
      </div>
    </div>
  );
}