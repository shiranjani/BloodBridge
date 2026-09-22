import { useEffect, useState } from "react";
import { FaUserCircle } from "react-icons/fa";
import PasswordSettings from "../components/PasswordSettings";
import { apiFetch } from "../services/api";
import { PHONE_VALIDATION_MESSAGE, digitsOnlyPhone, isValidPhoneNumber } from "../utils/phone";

// Profile page. Users update contact details and donor-related profile fields.
function ProfileView({ currentUser, onUserUpdate, setActiveScreen }) {
  const [profileForm, setProfileForm] = useState({
    fullName: currentUser?.fullName || "",
    phone: currentUser?.phone || "",
    bloodGroup: currentUser?.bloodGroup || "A+",
    location: currentUser?.location || "",
    lastDonation: "",
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    let mounted = true;

    if (currentUser?.role === "donor") {
      apiFetch("/donors")
        .then((donorsData) => {
          if (!mounted) return;
          const donorProfile = donorsData.find((donor) => donor.username === currentUser.username);
          if (donorProfile) {
            setProfileForm({
              fullName: donorProfile.name || currentUser.fullName || "",
              phone: donorProfile.phone || currentUser.phone || "",
              bloodGroup: donorProfile.bloodGroup || currentUser.bloodGroup || "A+",
              location: donorProfile.location || currentUser.location || "",
              lastDonation: donorProfile.lastDonation || "",
            });
          }
        })
        .catch((error) => console.error("Failed to load donor profile:", error));
    }

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  const updateField = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setMessage("");
    setMessageType("success");

    if (profileForm.phone && !isValidPhoneNumber(profileForm.phone)) {
      setMessageType("error");
      setMessage(PHONE_VALIDATION_MESSAGE);
      return;
    }

    try {
      const updatedUser = await apiFetch(`/profile/${currentUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(profileForm),
      });
      onUserUpdate?.(updatedUser);
      setMessageType("success");
      setMessage("Profile saved to database.");
    } catch (error) {
      console.error("Failed to save profile:", error);
      setMessageType("error");
      setMessage(error.message || "Unable to save profile.");
    }
  };

  return (
    <section className="page compact-page">
      <div className="profile-card">
        <form onSubmit={saveProfile}>
        <button className="back-button" onClick={() => setActiveScreen("donor")} type="button">Back</button>
        <div className="profile-head">
          <FaUserCircle />
          <div>
            <h2>{profileForm.fullName || currentUser?.fullName || "Profile"} <span>{profileForm.bloodGroup}</span></h2>
            <p><i /> {currentUser?.role === "donor" ? "Donor Profile" : "User Profile"}</p>
          </div>
        </div>
        <label>Full Name<input onChange={(e) => updateField("fullName", e.target.value)} required value={profileForm.fullName} /></label>
        <label>Phone<input maxLength="10" onChange={(e) => updateField("phone", digitsOnlyPhone(e.target.value))} value={profileForm.phone} /></label>
        <label>Blood Group<select onChange={(e) => updateField("bloodGroup", e.target.value)} value={profileForm.bloodGroup}><option>A+</option><option>A-</option><option>O+</option><option>O-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option></select></label>
        <label>Location<input onChange={(e) => updateField("location", e.target.value)} value={profileForm.location} /></label>
        {currentUser?.role === "donor" && (
          <label>Last Donation<input onChange={(e) => updateField("lastDonation", e.target.value)} type="date" value={profileForm.lastDonation} /></label>
        )}
        {message && <p className={`form-message ${messageType}`}>{message}</p>}
        <button className="primary-button full-width" type="submit">Save Profile</button>
      </form>
        <PasswordSettings currentUser={currentUser} />
      </div>
    </section>
  );
}

export default ProfileView;
