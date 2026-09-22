import { useEffect, useState } from "react";
import { apiFetch } from "../services/api";

// Blood request form. It creates request records through the backend API.
function BloodRequestForm({ currentUser, title }) {
  const [requestForm, setRequestForm] = useState({
    requester: currentUser?.fullName || "",
    bloodGroup: "A+",
    units: "1",
    hospital: "",
    type: "Normal",
    additionalInfo: "",
  });
  const [message, setMessage] = useState("");

  const updateField = (field, value) => {
    setRequestForm((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    if (currentUser?.fullName) {
      setRequestForm((current) => ({ ...current, requester: current.requester || currentUser.fullName }));
    }
  }, [currentUser]);

  const submitRequest = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      await apiFetch("/requests", {
        method: "POST",
        body: JSON.stringify({
          ...requestForm,
          requesterUserId: currentUser?.id || "",
          status: "Pending",
          assignedDonor: "",
          donorResponse: "Waiting",
          notificationStatus: "Not Sent",
          userNotificationStatus: "Not Sent",
          userResponseMessage: "",
        }),
      });
      setRequestForm({
        requester: currentUser?.fullName || "",
        bloodGroup: "A+",
        units: "1",
        hospital: "",
        type: "Normal",
        additionalInfo: "",
      });
      setMessage("Blood request saved to MySQL.");
    } catch (error) {
      console.error("Failed to submit request:", error);
      setMessage("Unable to save request. Please try again.");
    }
  };

  return (
    <form className="form-panel" onSubmit={submitRequest}>
      <h2>{title}</h2>
      <label>Requester<input onChange={(e) => updateField("requester", e.target.value)} placeholder="Patient, user, or hospital name" required value={requestForm.requester} /></label>
      <label>Blood Group<select onChange={(e) => updateField("bloodGroup", e.target.value)} value={requestForm.bloodGroup}><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option></select></label>
      <label>Units Needed<select onChange={(e) => updateField("units", e.target.value)} value={requestForm.units}><option>1</option><option>2</option><option>3</option><option>4</option></select></label>
      <label>Hospital / Location<input onChange={(e) => updateField("hospital", e.target.value)} placeholder="Enter hospital or location" required value={requestForm.hospital} /></label>
      <div className="radio-row">
        <label><input checked={requestForm.type === "Normal"} name="type" onChange={() => updateField("type", "Normal")} type="radio" /> Normal</label>
        <label><input checked={requestForm.type === "Emergency"} name="type" onChange={() => updateField("type", "Emergency")} type="radio" /> Emergency</label>
      </div>
      <label>Additional Information<textarea onChange={(e) => updateField("additionalInfo", e.target.value)} placeholder="Enter additional details..." value={requestForm.additionalInfo} /></label>
      {message && <p className="form-message">{message}</p>}
      <button className="primary-button full-width" type="submit">Submit Request</button>
    </form>
  );
}

export default BloodRequestForm;
