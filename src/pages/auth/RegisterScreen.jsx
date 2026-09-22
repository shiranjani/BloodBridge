import { FaTint, FaUserCircle } from "react-icons/fa";
import registerBackground from "../../assets/register-background.png";
import AuthForm from "../../components/AuthForm";

// Register page layout. It reuses the same AuthForm component with extra fields.
function RegisterScreen({ onLogin, setActiveScreen }) {
  return (
    <section className="page auth-page register-page">
      <div className="register-background-shell">
        <div className="auth-image-panel">
          <img src={registerBackground} alt="Blood donor registration" />
        </div>
        <div className="register-shell">
          <div className="auth-brand">
            <FaTint />
            <span>Blood Bridge</span>
          </div>
          <AuthForm
            mode="Register"
            icon={FaUserCircle}
            onAuthSuccess={onLogin}
            setActiveScreen={setActiveScreen}
            switchText="Already have an account?"
            switchAction="Login"
            onSwitch={() => setActiveScreen("login")}
          />
        </div>
      </div>
    </section>
  );
}

export default RegisterScreen;
