import { FaTint, FaUserCircle } from "react-icons/fa";
import loginBackground from "../../assets/login-background.png";
import AuthForm from "../../components/AuthForm";

// Login page layout. The left image and right form are styled in App.css.
function LoginScreen({ onLogin, setActiveScreen }) {
  return (
    <section className="page auth-page login-page">
      <div className="login-shell">
        <div className="auth-image-panel">
          <img src={loginBackground} alt="Blood donation support" />
        </div>
        <div className="login-form-panel">
          <div className="auth-brand">
            <FaTint />
            <span>Blood Bridge</span>
          </div>
          <AuthForm
            mode="Login"
            icon={FaUserCircle}
            onAuthSuccess={onLogin}
            setActiveScreen={setActiveScreen}
            switchText="Do not have an account?"
            switchAction="Create account"
            onSwitch={() => setActiveScreen("register")}
          />
        </div>
      </div>
    </section>
  );
}

export default LoginScreen;
