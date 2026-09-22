import { useCallback, useEffect, useState } from "react";
import { FaComments, FaHandHoldingMedical, FaSearch, FaTint, FaUserCircle } from "react-icons/fa";
import BloodRequestForm from "../../components/BloodRequestForm";
import DashboardLayout from "../../components/DashboardLayout";
import Metric from "../../components/Metric";
import PasswordSettings from "../../components/PasswordSettings";
import StatusBadge from "../../components/StatusBadge";
import { userMenu } from "../../data/navigation";
import { apiFetch } from "../../services/api";
import { PHONE_VALIDATION_MESSAGE, digitsOnlyPhone, isValidPhoneNumber } from "../../utils/phone";
import ChatSupportScreen from "../public/ChatSupportScreen";

// Normal user dashboard. Users can request blood, track requests, edit profile, and ask support.
function UserDashboard({ currentUser, onLogout, onUserUpdate, setActiveScreen }) {
  const [userSection, setUserSection] = useState("Dashboard");
  const name = currentUser?.fullName || "User";

  const handleMenuSelect = (item) => {
    if (item === "Find Donors") {
      setActiveScreen("donors");
      return;
    }
    setUserSection(item);
  };

  const renderUserContent = () => {
    if (userSection === "Blood Request") {
      return (
        <section className="admin-form-page">
          <h2 className="welcome-title">Blood Request</h2>
          <p className="admin-section-copy">Submit a normal or emergency blood request for admin review.</p>
          <BloodRequestForm currentUser={currentUser} title="Create Blood Request" />
        </section>
      );
    }

    if (userSection === "My Requests") {
      return <UserRequestsSection currentUser={currentUser} />;
    }

    if (userSection === "My Profile") {
      return <UserProfileSection currentUser={currentUser} onUserUpdate={onUserUpdate} />;
    }

    if (userSection === "Chat Support") {
      return <ChatSupportScreen currentUser={currentUser} />;
    }

    return <UserOverview currentUser={currentUser} onNavigate={setUserSection} setActiveScreen={setActiveScreen} />;
  };

  return (
    <DashboardLayout
      activeItem={userSection}
      menu={userMenu}
      onHome={() => setActiveScreen("home")}
      onLogout={onLogout}
      onMenuSelect={handleMenuSelect}
      title="User Dashboard"
      user={name}
    >
      <UserResponseNotificationBanner currentUser={currentUser} onNavigate={setUserSection} />
      {renderUserContent()}
    </DashboardLayout>
  );
}

function requestBelongsToUser(currentUser, request) {
  return (
    String(request.requesterUserId || "") === String(currentUser?.id || "")
    || (currentUser?.fullName && request.requester?.trim().toLowerCase() === currentUser.fullName.trim().toLowerCase())
    || (currentUser?.username && request.requester?.trim().toLowerCase() === currentUser.username.trim().toLowerCase())
  );
}

function getUserResponseNotifications(requests) {
  return requests.filter((request) => (
    isUserResponseVisible(request)
    && ["Accepted", "Rejected"].includes(request.donorResponse)
  ));
}

function isUserResponseVisible(request) {
  return (
    request.userNotificationStatus === "Sent"
    || ["Donor Accepted", "Donor Rejected"].includes(request.status)
  );
}

function getDisplayStatus(request) {
  if (request.status && request.status !== "Pending") return request.status;
  return "Pending";
}

function UserResponseNotificationBanner({ currentUser, onNavigate }) {
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = useCallback(async () => {
    const data = await apiFetch("/requests");
    const userRequests = data.filter((request) => requestBelongsToUser(currentUser, request));
    setNotifications(getUserResponseNotifications(userRequests));
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;

    const refresh = () => {
      loadNotifications()
        .catch((error) => {
          if (mounted) console.error("Failed to load user notifications:", error);
        });
    };

    refresh();
    const intervalId = setInterval(refresh, 8000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [loadNotifications]);

  if (notifications.length === 0) return null;

  return (
    <section className="admin-highlight">
      <div>
        <span>Donor Response Notification</span>
        <strong>{notifications.length} accepted/rejected donor response(s) received</strong>
      </div>
      <button className="primary-button" onClick={() => onNavigate("My Requests")} type="button">
        View Responses
      </button>
    </section>
  );
}

function UserOverview({ currentUser, onNavigate, setActiveScreen }) {
  const [requests, setRequests] = useState([]);

  const loadRequests = useCallback(async () => {
    const data = await apiFetch("/requests");
    setRequests(data.filter((request) => requestBelongsToUser(currentUser, request)));
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;

    const refresh = () => {
      loadRequests()
        .catch((error) => {
          if (mounted) console.error("Failed to load user overview:", error);
        });
    };

    refresh();
    const intervalId = setInterval(refresh, 8000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [loadRequests]);

  const pendingCount = requests.filter((request) => request.status === "Pending").length;
  const approvedCount = requests.filter((request) => request.status === "Approved").length;

  return (
    <>
      <h2 className="welcome-title">Welcome, {currentUser?.fullName || "User"}!</h2>
      <div className="metric-grid">
        <Metric icon={FaHandHoldingMedical} value={requests.length} label="My Requests" />
        <Metric icon={FaTint} value={pendingCount} label="Pending" />
        <Metric icon={FaTint} value={approvedCount} label="Approved" />
        <Metric icon={FaComments} value="24/7" label="Support" />
      </div>
      <h3 className="section-title">Quick Actions</h3>
      <div className="action-grid">
        <button onClick={() => onNavigate("Blood Request")} type="button"><FaTint /> Request Blood</button>
        <button onClick={() => setActiveScreen("donors")} type="button"><FaSearch /> Find Donors</button>
        <button onClick={() => onNavigate("Chat Support")} type="button"><FaComments /> Chat Support</button>
      </div>
      <UserRequestsSection currentUser={currentUser} compact />
    </>
  );
}

function UserRequestsSection({ compact = false, currentUser }) {
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState("");

  const loadRequests = useCallback(async () => {
    const data = await apiFetch("/requests");
    setRequests(data.filter((request) => requestBelongsToUser(currentUser, request)));
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;

    const refresh = () => {
      loadRequests()
        .catch((error) => {
          if (!mounted) return;
          console.error("Failed to load user requests:", error);
          setMessage("Unable to load your requests.");
        });
    };

    refresh();
    const intervalId = setInterval(refresh, 8000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [loadRequests]);

  const visibleRequests = compact ? requests.slice(0, 4) : requests;
  const responseNotifications = getUserResponseNotifications(requests);

  return (
    <section className="table-panel wide">
      <h2 className={compact ? "" : "welcome-title"}>{compact ? "Recent Requests" : "My Requests"}</h2>
      <p className="table-helper">Requests you submit will appear here after they are saved.</p>
      {message && <p className="form-message error">{message}</p>}
      {!compact && responseNotifications.length > 0 && (
        <div className="notification-list">
          {responseNotifications.map((request) => (
            <article className="notification-card" key={request.id}>
              <div>
                <strong>{request.assignedDonor || "Assigned donor"} {request.donorResponse.toLowerCase()} your request</strong>
                <span>{request.bloodGroup} blood, {request.units} unit(s), {request.hospital || "not specified"}</span>
                {request.userResponseMessage && <span>{request.userResponseMessage}</span>}
              </div>
              <StatusBadge status={request.donorResponse} />
            </article>
          ))}
        </div>
      )}
      <table className="data-table">
        <thead><tr><th>Requester</th><th>Blood</th><th>Units</th><th>Hospital</th><th>Type</th><th>Donor Response</th><th>Status</th></tr></thead>
        <tbody>
          {visibleRequests.map((request) => {
            const responseSent = isUserResponseVisible(request);
            const donorResponse = responseSent ? request.donorResponse || "Waiting" : "Waiting for Admin";

            return (
              <tr key={request.id}>
                <td>{request.requester}</td>
                <td>{request.bloodGroup}</td>
                <td>{request.units}</td>
                <td>{request.hospital || "-"}</td>
                <td className={request.type === "Emergency" ? "danger-text" : ""}>{request.type}</td>
                <td>
                  <StatusBadge status={donorResponse} />
                  {responseSent && request.userResponseMessage && (
                    <p className="table-helper">{request.userResponseMessage}</p>
                  )}
                </td>
                <td><StatusBadge status={getDisplayStatus(request)} /></td>
              </tr>
            );
          })}
          {visibleRequests.length === 0 && (
            <tr>
              <td className="empty-table-cell" colSpan="7">
                No blood requests yet. Create a request and it will appear here.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

function UserProfileSection({ currentUser, onUserUpdate }) {
  const [profileForm, setProfileForm] = useState({
    fullName: currentUser?.fullName || "",
    phone: currentUser?.phone || "",
    bloodGroup: currentUser?.bloodGroup || "A+",
    location: currentUser?.location || "",
  });
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

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
      setMessage("Profile saved successfully.");
    } catch (error) {
      console.error("Failed to save user profile:", error);
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
          <p><i /> User Profile</p>
        </div>
      </div>
      <form className="form-panel embedded-form" onSubmit={saveProfile}>
        <label>Full Name<input onChange={(event) => updateField("fullName", event.target.value)} required value={profileForm.fullName} /></label>
        <label>Phone<input maxLength="10" onChange={(event) => updateField("phone", digitsOnlyPhone(event.target.value))} value={profileForm.phone} /></label>
        <label>Blood Group<select onChange={(event) => updateField("bloodGroup", event.target.value)} value={profileForm.bloodGroup}><option>A+</option><option>A-</option><option>O+</option><option>O-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option></select></label>
        <label>Location<input onChange={(event) => updateField("location", event.target.value)} value={profileForm.location} /></label>
        {message && <p className={`form-message ${messageType}`}>{message}</p>}
        <button className="primary-button full-width" type="submit">Save Profile</button>
      </form>
      <PasswordSettings currentUser={currentUser} />
    </section>
  );
}

export default UserDashboard;
