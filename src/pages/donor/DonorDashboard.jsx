import { useEffect, useState } from "react";
import { FaCalendarAlt, FaHandHoldingMedical, FaTint, FaUser, FaUserCircle, FaUsers } from "react-icons/fa";
import { donorMenu } from "../../data/navigation";
import { apiFetch } from "../../services/api";
import { donorMatchesRequest } from "../../utils/donorRequest";
import { PHONE_VALIDATION_MESSAGE, digitsOnlyPhone, isValidPhoneNumber } from "../../utils/phone";
import BloodRequestForm from "../../components/BloodRequestForm";
import DashboardLayout from "../../components/DashboardLayout";
import Metric from "../../components/Metric";
import PasswordSettings from "../../components/PasswordSettings";
import StatusBadge from "../../components/StatusBadge";
import { ActivityTable } from "../../components/Tables";
import BloodRequestScreen from "../BloodRequestScreen";
import ChatSupportScreen from "../public/ChatSupportScreen";
import DonorNotifications from "./DonorNotifications";

// Donor dashboard. Shows donor actions, profile summary, requests, and notifications.
function DonorDashboard({ currentUser, onLogout, setActiveScreen }) {
  const [donorSection, setDonorSection] = useState("Dashboard");
  const name = currentUser?.fullName || "Donor";
  const bloodGroup = currentUser?.bloodGroup || "-";

  const renderDonorContent = () => {
    if (donorSection === "Notifications") {
      return <DonorNotifications currentUser={currentUser} />;
    }

    if (donorSection === "My Profile") {
      return <DonorProfileSection currentUser={currentUser} />;
    }

    if (donorSection === "My Donations") {
      return <DonorDonationSection currentUser={currentUser} />;
    }

    if (donorSection === "Requests") {
      return <BloodRequestScreen currentUser={currentUser} />;
    }

    if (donorSection === "Chat Support") {
      return <ChatSupportScreen currentUser={currentUser} />;
    }

    return (
      <>
        <h2 className="welcome-title">Welcome, {name}!</h2>
        <div className="metric-grid">
          <Metric icon={FaTint} value="2" label="Donations" />
          <Metric icon={FaHandHoldingMedical} value="1" label="Requests Helped" />
          <Metric icon={FaCalendarAlt} value="120" label="Days Since Last Donation" />
          <Metric icon={FaTint} value={bloodGroup} label="Blood Group" />
        </div>
        <h3 className="section-title">Quick Actions</h3>
        <div className="action-grid">
          <button onClick={() => setDonorSection("Requests")} type="button"><FaTint /> Request Blood</button>
          <button onClick={() => setActiveScreen("donors")} type="button"><FaUsers /> Find Donors</button>
          <button onClick={() => setActiveScreen("profile")} type="button"><FaUser /> Update Profile</button>
        </div>
        <section className="dashboard-request-section">
          <BloodRequestForm currentUser={currentUser} title="Create Blood Request" />
        </section>
        <ActivityTable />
      </>
    );
  };

  return (
    <DashboardLayout
      activeItem={donorSection}
      menu={donorMenu}
      onHome={() => setActiveScreen("home")}
      onLogout={onLogout}
      onMenuSelect={setDonorSection}
      title="Blood Donation System"
      user={name}
    >
      {renderDonorContent()}
    </DashboardLayout>
  );
}

// Donor account profile editor used by the donor sidebar.
function DonorProfileSection({ currentUser }) {
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

    apiFetch("/donors")
      .then((donorsData) => {
        if (!mounted) return;
        const donorProfile = donorsData.find((donor) => donor.username === currentUser?.username);
        if (donorProfile) {
          setProfileForm({
            fullName: donorProfile.name || currentUser?.fullName || "",
            phone: donorProfile.phone || currentUser?.phone || "",
            bloodGroup: donorProfile.bloodGroup || currentUser?.bloodGroup || "A+",
            location: donorProfile.location || currentUser?.location || "",
            lastDonation: donorProfile.lastDonation || "",
          });
        }
      })
      .catch((error) => console.error("Failed to load donor profile:", error));

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
      await apiFetch(`/profile/${currentUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(profileForm),
      });
      setMessageType("success");
      setMessage("Profile saved successfully.");
    } catch (error) {
      console.error("Failed to save donor profile:", error);
      setMessageType("error");
      setMessage(error.message || "Unable to save profile.");
    }
  };

  return (
    <section className="profile-card donor-account-card">
      <div className="profile-head">
        <FaUserCircle />
        <div>
          <h2>{profileForm.fullName || "My Profile"} <span>{profileForm.bloodGroup}</span></h2>
          <p><i /> Donor Profile</p>
        </div>
      </div>
      <form className="form-panel embedded-form" onSubmit={saveProfile}>
        <label>Full Name<input onChange={(event) => updateField("fullName", event.target.value)} required value={profileForm.fullName} /></label>
        <label>Phone<input maxLength="10" onChange={(event) => updateField("phone", digitsOnlyPhone(event.target.value))} value={profileForm.phone} /></label>
        <label>Blood Group<select onChange={(event) => updateField("bloodGroup", event.target.value)} value={profileForm.bloodGroup}><option>A+</option><option>A-</option><option>O+</option><option>O-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option></select></label>
        <label>Location<input onChange={(event) => updateField("location", event.target.value)} value={profileForm.location} /></label>
        <label>Last Donation<input onChange={(event) => updateField("lastDonation", event.target.value)} type="date" value={profileForm.lastDonation} /></label>
        {message && <p className={`form-message ${messageType}`}>{message}</p>}
        <button className="primary-button full-width" type="submit">Save Profile</button>
      </form>
      <PasswordSettings currentUser={currentUser} />
    </section>
  );
}

// Donor donation history section. It uses request assignments plus the donor last-donation date.
function DonorDonationSection({ currentUser }) {
  const [requests, setRequests] = useState([]);
  const [donorProfile, setDonorProfile] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    Promise.all([apiFetch("/requests"), apiFetch("/donors")])
      .then(([requestData, donorData]) => {
        if (!mounted) return;
        const matchingDonorProfile = donorData.find((donor) => donor.username === currentUser?.username) || null;
        setRequests(requestData.filter((request) => donorMatchesRequest(currentUser, request, matchingDonorProfile)));
        setDonorProfile(matchingDonorProfile);
      })
      .catch((error) => {
        console.error("Failed to load donor donations:", error);
        setMessage("Unable to load donation activity.");
      });

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  const completedDonations = requests.filter((request) =>
    ["Completed", "Donor Accepted"].includes(request.status) || request.donorResponse === "Accepted"
  );
  const lastDonation = donorProfile?.lastDonation || "Not added";

  return (
    <section className="table-panel wide">
      <h2 className="welcome-title">My Donations</h2>
      <p className="table-helper">Your donation activity is based on your donor profile and requests assigned by admin.</p>
      {message && <p className="form-message error">{message}</p>}
      <div className="metric-grid donation-summary-grid">
        <Metric icon={FaTint} value={completedDonations.length} label="Confirmed Donations" />
        <Metric icon={FaHandHoldingMedical} value={requests.length} label="Assigned Requests" />
        <Metric icon={FaCalendarAlt} value={lastDonation} label="Last Donation" />
      </div>
      <table className="data-table">
        <thead><tr><th>Requester</th><th>Blood</th><th>Units</th><th>Hospital</th><th>Donor Reply</th><th>Status</th></tr></thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              <td>{request.requester}</td>
              <td>{request.bloodGroup}</td>
              <td>{request.units}</td>
              <td>{request.hospital || "-"}</td>
              <td><StatusBadge status={request.donorResponse || "Waiting"} /></td>
              <td><StatusBadge status={request.status || "Pending"} /></td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr>
              <td className="empty-table-cell" colSpan="6">
                No donation activity yet. Assigned requests and accepted donation help will appear here.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

export default DonorDashboard;
