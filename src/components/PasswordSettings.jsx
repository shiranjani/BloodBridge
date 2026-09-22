import { useState } from "react";
import { FaEye, FaEyeSlash, FaKey } from "react-icons/fa";
import { apiFetch } from "../services/api";

function PasswordField({ label, onChange, placeholder, value }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label>
      {label}
      <div className="password-input-wrapper">
        <input
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required
          type={showPassword ? "text" : "password"}
          value={value}
        />
        <button className="password-toggle" onClick={() => setShowPassword(!showPassword)} type="button">
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
    </label>
  );
}

function PasswordSettings({ currentUser }) {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const updateField = (field, value) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setMessage("");
    setMessageType("success");

    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (newPassword.length < 8) {
      setMessageType("error");
      setMessage("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessageType("error");
      setMessage("New passwords do not match.");
      return;
    }

    try {
      const result = await apiFetch("/auth/change-password", {
        method: "PATCH",
        body: JSON.stringify({
          userId: currentUser.id,
          currentPassword: passwordForm.currentPassword,
          newPassword,
        }),
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessageType("success");
      setMessage(result.message || "Password changed successfully.");
    } catch (error) {
      console.error("Failed to change password:", error);
      setMessageType("error");
      setMessage(error.message || "Unable to change password.");
    }
  };

  return (
    <form className="form-panel embedded-form password-settings-form" onSubmit={savePassword}>
      <h3><FaKey /> Change Password</h3>
      <PasswordField
        label="Current Password"
        onChange={(value) => updateField("currentPassword", value)}
        placeholder="Enter current password"
        value={passwordForm.currentPassword}
      />
      <PasswordField
        label="New Password"
        onChange={(value) => updateField("newPassword", value)}
        placeholder="Enter new password"
        value={passwordForm.newPassword}
      />
      <PasswordField
        label="Confirm New Password"
        onChange={(value) => updateField("confirmPassword", value)}
        placeholder="Confirm new password"
        value={passwordForm.confirmPassword}
      />
      <p className="password-rule-note">Use at least 8 characters.</p>
      {message && <p className={`form-message ${messageType}`}>{message}</p>}
      <button className="primary-button full-width" type="submit">Change Password</button>
    </form>
  );
}

export default PasswordSettings;
