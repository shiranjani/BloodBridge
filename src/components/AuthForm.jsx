import { useState } from "react";
import { FaEye, FaEyeSlash, FaLock, FaSignInAlt } from "react-icons/fa";
import { apiFetch } from "../services/api";
import { PHONE_VALIDATION_MESSAGE, digitsOnlyPhone, isValidPhoneNumber } from "../utils/phone";

// Shared login/register form. The "mode" value controls which fields and API endpoint are used.
function AuthForm({ mode, icon: Icon, switchText, switchAction, onSwitch, onAuthSuccess }) {
  const isLogin = mode === "Login";
  const [authView, setAuthView] = useState("auth");
  const isForgotPassword = isLogin && authView === "forgot";
  const emptyForm = {
    fullName: "",
    username: "",
    password: "",
    confirmPassword: "",
    phone: "",
    bloodGroup: "A+",
    location: "",
    role: "user",
  };
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setMessage("");
    setMessageType("info");
    const password = form.password.trim();
    const confirmPassword = form.confirmPassword.trim();

    if ((isForgotPassword || !isLogin) && password.length < 8) {
      setMessageType("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }

    if ((isForgotPassword || !isLogin) && password !== confirmPassword) {
      setMessageType("error");
      setMessage("Passwords do not match.");
      return;
    }

    if (!isLogin && form.phone && !isValidPhoneNumber(form.phone)) {
      setMessageType("error");
      setMessage(PHONE_VALIDATION_MESSAGE);
      return;
    }

    try {
      if (isForgotPassword) {
        const result = await apiFetch("/auth/forgot-password", {
          method: "PATCH",
          body: JSON.stringify({ username: form.username, newPassword: password }),
        });

        setMessageType("success");
        setMessage(result.message || "Password reset successfully. You can login with the new password.");
        setForm({ ...emptyForm, username: form.username });
        setShowPassword(false);
        setShowConfirmPassword(false);
        setAuthView("auth");
        return;
      }

      const user = await apiFetch(isLogin ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: JSON.stringify(isLogin ? { username: form.username, password: form.password } : { ...form, password, confirmPassword }),
      });

      setMessageType("success");
      setMessage(isLogin ? "Login successful." : "Registration successful.");
      if (isLogin) {
        onAuthSuccess?.(user);
      } else {
        setForm(emptyForm);
        setShowPassword(false);
        setShowConfirmPassword(false);
        onAuthSuccess?.(user);
      }
    } catch (error) {
      console.error(`${mode} failed:`, error);
      setMessageType("error");
      setMessage(isForgotPassword ? error.message || "Unable to reset password." : isLogin ? "Wrong username or password. Please check your login credentials and try again." : error.message || "Unable to register this account.");
    }
  };

  return (
    <form className="auth-form" onSubmit={submitAuth}>
      <Icon className="auth-avatar" />
      <h2>{isForgotPassword ? "Reset Password" : mode}</h2>
      <p className="auth-subtitle">
        {isForgotPassword
          ? "Enter your username and choose a new password."
          : isLogin
          ? "Welcome back. Sign in to continue helping patients faster."
          : "Create your account and choose user or donor access."}
      </p>
      {!isLogin && (
        <label>Full Name<input onChange={(e) => updateField("fullName", e.target.value)} placeholder="Enter your full name" required value={form.fullName} /></label>
      )}
      <label>Username<input onChange={(e) => updateField("username", e.target.value)} placeholder="Enter your username" required value={form.username} /></label>
      <label>{isForgotPassword ? "New Password" : "Password"}<div className="password-input-wrapper"><input onChange={(e) => updateField("password", e.target.value)} placeholder={isForgotPassword ? "Enter new password" : isLogin ? "Enter your password" : "Create a password"} required type={showPassword ? "text" : "password"} value={form.password} /><button className="password-toggle" onClick={() => setShowPassword(!showPassword)} type="button">{showPassword ? <FaEyeSlash /> : <FaEye />}</button></div></label>
      {(isForgotPassword || !isLogin) && <p className="password-rule-note">Please create a password with at least 8 characters.</p>}
      {(isForgotPassword || !isLogin) && (
        <label>Confirm Password<div className="password-input-wrapper"><input onChange={(e) => updateField("confirmPassword", e.target.value)} placeholder={isForgotPassword ? "Confirm new password" : "Confirm your password"} required type={showConfirmPassword ? "text" : "password"} value={form.confirmPassword} /><button className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)} type="button">{showConfirmPassword ? <FaEyeSlash /> : <FaEye />}</button></div></label>
      )}
      {!isLogin && (
        <>
          <label>Phone<input maxLength="10" onChange={(e) => updateField("phone", digitsOnlyPhone(e.target.value))} placeholder="0771234567" value={form.phone} /></label>
          <label>Blood Group<select onChange={(e) => updateField("bloodGroup", e.target.value)} value={form.bloodGroup}><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option></select></label>
          <label>Location<input onChange={(e) => updateField("location", e.target.value)} placeholder="Kandy" value={form.location} /></label>
          <label>Account Type<select onChange={(e) => updateField("role", e.target.value)} value={form.role}><option value="user">User</option><option value="donor">Donor</option></select></label>
        </>
      )}
      {isLogin && (
        <button
          className="link-button"
          onClick={() => {
            setAuthView(isForgotPassword ? "auth" : "forgot");
            setMessage("");
          }}
          type="button"
        >
          {isForgotPassword ? "Back to Login" : "Forgot Password?"}
        </button>
      )}
      {message && <p className={`form-message ${messageType}`}>{message}</p>}
      <button className="primary-button full-width" type="submit">
        {isForgotPassword ? <FaLock /> : isLogin ? <FaSignInAlt /> : <FaLock />} {isForgotPassword ? "Reset Password" : mode}
      </button>
      {!isForgotPassword && <p className="auth-switch">
        {switchText} <button onClick={onSwitch} type="button">{switchAction}</button>
      </p>}
    </form>
  );
}

export default AuthForm;
