import { useCallback, useEffect, useState } from "react";
import { FaExclamationTriangle, FaEye, FaEyeSlash, FaFlask, FaHandHoldingMedical, FaTint, FaUsers } from "react-icons/fa";
import { adminMenu } from "../../data/navigation";
import { apiFetch } from "../../services/api";
import { getInventoryAlert } from "../../utils/inventory";
import { PHONE_VALIDATION_MESSAGE, digitsOnlyPhone, isValidPhoneNumber } from "../../utils/phone";
import BloodRequestForm from "../../components/BloodRequestForm";
import DashboardLayout from "../../components/DashboardLayout";
import Metric from "../../components/Metric";
import StatusBadge from "../../components/StatusBadge";
import { RequestsTable } from "../../components/Tables";
import ChatSupportScreen from "../public/ChatSupportScreen";

function uniqueRowsByText(rows, getText) {
  const seen = new Set();

  return rows.filter((row) => {
    const key = String(getText(row) || "").trim().toLowerCase();

    if (!key) return true;
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

// Admin dashboard controller. It switches between admin management sections.
function AdminDashboard({ currentUser, onLogout, setActiveScreen }) {
  const [adminSection, setAdminSection] = useState("Dashboard");
  const name = currentUser?.fullName || "Admin";

  return (
    <DashboardLayout
      activeItem={adminSection}
      menu={adminMenu}
      onHome={() => setActiveScreen("home")}
      onLogout={onLogout}
      onMenuSelect={setAdminSection}
      title="Admin Dashboard"
      user={name}
    >
      {adminSection === "Expiry Alerts" ? (
        <ExpiryAlertsContent />
      ) : adminSection === "Blood Request" ? (
        <AdminBloodRequestSection />
      ) : adminSection === "Manage Donors" ? (
        <ManageDonorsSection />
      ) : adminSection === "Manage Requests" ? (
        <ManageRequestsSection />
      ) : adminSection === "Blood Inventory" ? (
        <BloodInventorySection />
      ) : adminSection === "Users" ? (
        <UsersSection />
      ) : adminSection === "Chat Support" ? (
        <ChatSupportScreen currentUser={currentUser} />
      ) : (
        <AdminOverview
          onManageRequests={() => setAdminSection("Manage Requests")}
        />
      )}
    </DashboardLayout>
  );
}

// Admin donor management. Admins can create donors and update donor records.
function ManageDonorsSection() {
  const [activeDonorView, setActiveDonorView] = useState("records");
  const [donorForm, setDonorForm] = useState({
    name: "",
    phone: "",
    bloodGroup: "A+",
    location: "",
    birthday: "",
    lastDonation: "",
    username: "",
    password: "",
  });
  const [donorRows, setDonorRows] = useState([]);
  const [isLoadingDonors, setIsLoadingDonors] = useState(true);
  const [donorFilters, setDonorFilters] = useState({
    search: "",
    bloodGroup: "All",
    location: "",
  });
  const [showDonorPassword, setShowDonorPassword] = useState(false);
  const [generatingCredentials, setGeneratingCredentials] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    apiFetch("/donors")
      .then((data) => {
        if (mounted) setDonorRows(data);
      })
      .catch((error) => console.error("Failed to load donors:", error))
      .finally(() => {
        if (mounted) setIsLoadingDonors(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const updateField = (field, value) => {
    setDonorForm((current) => ({ ...current, [field]: value }));
  };

  const saveDonor = async (event) => {
    event.preventDefault();
    if (!isValidPhoneNumber(donorForm.phone)) {
      alert(PHONE_VALIDATION_MESSAGE);
      return;
    }

    try {
      const created = await apiFetch("/donors", {
        method: "POST",
        body: JSON.stringify(donorForm),
      });
      setDonorRows((existing) => [created, ...existing]);
      setActiveDonorView("records");
      setDonorForm({
        name: "",
        phone: "",
        bloodGroup: "A+",
        location: "",
        birthday: "",
        lastDonation: "",
        username: "",
        password: "",
      });
      setGenerationMessage("");
    } catch (error) {
      console.error("Failed to save donor:", error);
      alert(error.message || "Unable to save donor. Please try again.");
    }
  };

  const getBirthdayParts = (birthday) => {
    const [year = "", month = "", day = ""] = birthday.split("-");
    return { year, month, day };
  };

  const generateUsername = (name, birthday) => {
    const firstName = name
      .trim()
      .toLowerCase()
      .split(/\s+/)[0]
      ?.replace(/[^a-z0-9]/g, "") || "donor";
    const { year, day } = getBirthdayParts(birthday);
    const namePart = firstName.slice(0, 4).padEnd(4, "x");

    return `${namePart}${day || "01"}${year.slice(-2) || "00"}`;
  };

  const generatePassword = (_name, birthday) => {
    const { year, month, day } = getBirthdayParts(birthday);

    return `${day}${month}${year}`.slice(0, 8);
  };

  const generateCredentials = () => {
    if (!donorForm.name || !donorForm.birthday) {
      setGenerationMessage("Please enter donor name and birthday first.");
      return;
    }

    setGeneratingCredentials(true);
    setGenerationMessage("");

    const baseUsername = generateUsername(donorForm.name, donorForm.birthday);
    const generatedPassword = generatePassword(donorForm.name, donorForm.birthday);
    const existingUsernames = new Set(
      donorRows
        .map((donor) => donor.username?.trim().toLowerCase())
        .filter(Boolean)
    );
    let finalUsername = baseUsername;
    let attempt = 1;

    while (existingUsernames.has(finalUsername.toLowerCase())) {
      attempt += 1;
      const suffix = String(attempt).padStart(2, "0").slice(-2);
      finalUsername = `${baseUsername.slice(0, 6)}${suffix}`;
    }

    updateField("username", finalUsername);
    updateField("password", generatedPassword);
    setGenerationMessage(`Generated username ${finalUsername} and password ${generatedPassword}.`);
    setGeneratingCredentials(false);
  };

  const filteredDonors = uniqueRowsByText(donorRows, (donor) => donor.name).filter((donor) => {
    const searchText = donorFilters.search.toLowerCase();
    const matchesSearch = !searchText
      || donor.id.toLowerCase().includes(searchText)
      || donor.name?.toLowerCase().includes(searchText)
      || donor.phone?.toLowerCase().includes(searchText);
    const matchesBlood = donorFilters.bloodGroup === "All" || donor.bloodGroup === donorFilters.bloodGroup;
    const matchesLocation = !donorFilters.location || donor.location?.toLowerCase().includes(donorFilters.location.toLowerCase());

    return matchesSearch && matchesBlood && matchesLocation;
  });

  const updateFilter = (field, value) => {
    setDonorFilters((current) => ({ ...current, [field]: value }));
  };

  return (
    <section className="admin-manage-page">
      <div className="admin-section-head">
        <div>
          <h2 className="welcome-title">Manage Donors</h2>
          <p>Add donors, track availability, and keep donor details ready for matching.</p>
        </div>
        <div className="section-tabs">
          <button className={activeDonorView === "add" ? "active" : ""} onClick={() => setActiveDonorView("add")} type="button">Add Donor</button>
          <button className={activeDonorView === "records" ? "active" : ""} onClick={() => setActiveDonorView("records")} type="button">Donor Records</button>
        </div>
      </div>
      {activeDonorView === "add" ? (
        <form className="form-panel donor-form-page" onSubmit={saveDonor}>
          <h2>Add Donor</h2>
          <label>Full Name<input onChange={(e) => updateField("name", e.target.value)} placeholder="Enter donor name" required value={donorForm.name} /></label>
          <label>Phone<input maxLength="10" onChange={(e) => updateField("phone", digitsOnlyPhone(e.target.value))} placeholder="0771234567" required value={donorForm.phone} /></label>
          <label>Blood Group<select onChange={(e) => updateField("bloodGroup", e.target.value)} value={donorForm.bloodGroup}><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option></select></label>
          <label>Location<input onChange={(e) => updateField("location", e.target.value)} placeholder="Kandy" required value={donorForm.location} /></label>
          <label>Birthday<input onChange={(e) => updateField("birthday", e.target.value)} type="date" value={donorForm.birthday} /></label>
          <label>Last Donation<input onChange={(e) => updateField("lastDonation", e.target.value)} type="date" value={donorForm.lastDonation} /></label>
          <div className="credential-generator">
            <label>Username<input onChange={(e) => updateField("username", e.target.value)} placeholder="Enter username" required value={donorForm.username} /></label>
            <label>Password<div className="password-input-wrapper"><input onChange={(e) => updateField("password", e.target.value)} placeholder="Enter password" type={showDonorPassword ? "text" : "password"} required value={donorForm.password} /><button className="password-toggle" onClick={() => setShowDonorPassword(!showDonorPassword)} type="button">{showDonorPassword ? <FaEyeSlash /> : <FaEye />}</button></div></label>
            <button className="generate-button" disabled={generatingCredentials} onClick={generateCredentials} type="button">{generatingCredentials ? "Generating..." : "Generate"}</button>
          </div>
          {generationMessage && <p className="generation-message">{generationMessage}</p>}
          <button className="primary-button full-width" type="submit">Save Donor</button>
        </form>
      ) : (
        <section className="table-panel donor-records-page">
          <h3>Donor Records</h3>
          <div className="filter-bar">
            <label>Search ID / Name / Phone<input onChange={(e) => updateFilter("search", e.target.value)} placeholder="Paste donor ID or search name" value={donorFilters.search} /></label>
            <label>Blood Group<select onChange={(e) => updateFilter("bloodGroup", e.target.value)} value={donorFilters.bloodGroup}><option>All</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option></select></label>
            <label>Location<input onChange={(e) => updateFilter("location", e.target.value)} placeholder="Kandy" value={donorFilters.location} /></label>
          </div>
          <p className="table-helper">
            {isLoadingDonors ? "Loading donor records from MySQL..." : `${filteredDonors.length} donor records found in database.`}
          </p>
          <table className="data-table">
            <thead><tr><th>Donor ID</th><th>Name</th><th>Phone</th><th>Blood</th><th>Location</th><th>Last Donation</th></tr></thead>
            <tbody>
              {filteredDonors.map((donor) => (
                <tr key={donor.id}>
                  <td className="id-cell">{donor.id}</td>
                  <td>{donor.name}</td>
                  <td>{donor.phone}</td>
                  <td>{donor.bloodGroup}</td>
                  <td>{donor.location}</td>
                  <td>{donor.lastDonation || "-"}</td>
                </tr>
              ))}
              {!isLoadingDonors && filteredDonors.length === 0 && (
                <tr>
                  <td className="empty-table-cell" colSpan="6">
                    No donor records in the database yet. Add a donor from the form and it will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </section>
  );
}

// Admin request management. Admins assign donors and update request progress.
function ManageRequestsSection() {
  const [requestForm, setRequestForm] = useState({
    requester: "",
    bloodGroup: "A+",
    units: "1",
    hospital: "",
    type: "Normal",
    status: "Pending",
  });
  const [requestRows, setRequestRows] = useState([]);
  const [donorRows, setDonorRows] = useState([]);
  const [inventoryRows, setInventoryRows] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");

  const loadWorkflowData = useCallback(async () => {
    const [requestsData, donorsData, inventoryData] = await Promise.all([
      apiFetch("/requests"),
      apiFetch("/donors"),
      apiFetch("/inventory"),
    ]);

    setRequestRows(requestsData);
    setSelectedRequestId((current) => current || requestsData[0]?.id || "");
    setDonorRows(donorsData);
    setInventoryRows(inventoryData);
  }, []);

  useEffect(() => {
    let mounted = true;

    const refresh = () => {
      loadWorkflowData()
        .catch((error) => {
          if (mounted) console.error("Failed to load request workflow data:", error);
        });
    };

    refresh();
    const intervalId = setInterval(refresh, 8000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [loadWorkflowData]);

  const updateField = (field, value) => {
    setRequestForm((current) => ({ ...current, [field]: value }));
  };

  const saveRequest = async (event) => {
    event.preventDefault();
    try {
      const created = await apiFetch("/requests", {
        method: "POST",
        body: JSON.stringify({
          ...requestForm,
          assignedDonor: "",
          donorResponse: "Waiting",
          notificationStatus: "Not Sent",
          userNotificationStatus: "Not Sent",
          userResponseMessage: "",
        }),
      });
      setRequestRows((existing) => [created, ...existing]);
      setRequestForm({
        requester: "",
        bloodGroup: "A+",
        units: "1",
        hospital: "",
        type: "Normal",
        status: "Pending",
      });
      setSelectedRequestId(created.id);
    } catch (error) {
      console.error("Failed to save request:", error);
      alert("Unable to save request. Please try again.");
    }
  };

  const selectedRequest = requestRows.find((request) => request.id === selectedRequestId) || requestRows[0];
  const pendingDonorResponses = requestRows.filter((request) => (
    ["Accepted", "Rejected"].includes(request.donorResponse)
    && request.userNotificationStatus !== "Sent"
  ));
  const matchingDonors = selectedRequest
    ? uniqueRowsByText(donorRows, (donor) => donor.name).filter((donor) => donor.bloodGroup === selectedRequest.bloodGroup)
    : [];
  const reservedInventory = selectedRequest
    ? inventoryRows.filter((item) => item.bloodGroup === selectedRequest.bloodGroup && item.status === "Reserved")
    : [];
  const availableInventory = selectedRequest
    ? inventoryRows.filter((item) => item.bloodGroup === selectedRequest.bloodGroup && item.status === "Available")
    : [];

  const updateRequest = async (requestId, updates) => {
    if (requestId.startsWith("#")) return;

    try {
      const updated = await apiFetch(`/requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      setRequestRows((existing) => existing.map((item) => (item.id === requestId ? updated : item)));
      return updated;
    } catch (error) {
      console.error("Failed to update request:", error);
      alert("Unable to update request. Please try again.");
    }
  };

  const notifyDonor = async (request, donor) => {
    const updated = await updateRequest(request.id, {
      assignedDonor: donor.name,
      assignedDonorId: donor.id,
      donorPhone: donor.phone || "",
      donorResponse: "Waiting",
      notificationStatus: "Sent",
      userNotificationStatus: "Not Sent",
      userResponseMessage: "",
      status: "Approved",
    });
    if (updated) alert(`Notification sent to ${donor.name}.`);
  };

  const sendDonorResponseToUser = async (request, responseOverride = "") => {
    const donorResponse = responseOverride || request.donorResponse;
    const accepted = donorResponse === "Accepted";
    const rejected = donorResponse === "Rejected";

    if (!accepted && !rejected) {
      alert("Donor response is still waiting.");
      return;
    }

    const responseText = accepted ? "accepted" : "rejected";
    const updated = await updateRequest(request.id, {
      donorResponse,
      userNotificationStatus: "Sent",
      userResponseMessage: `${request.assignedDonor || "The assigned donor"} ${responseText} your ${request.bloodGroup} blood request for ${request.hospital || "the selected hospital"}.`,
      status: accepted ? "Donor Accepted" : "Donor Rejected",
    });

    if (updated) {
      setSelectedRequestId(updated.id);
      alert(`Donor ${responseText} response sent to ${request.requester}.`);
    }
  };

  return (
    <section className="admin-manage-page">
      <div className="admin-section-head">
        <div>
          <h2 className="welcome-title">Manage Requests</h2>
          <p>Approve, prioritize, and track blood requests from users and hospitals.</p>
        </div>
      </div>
      {pendingDonorResponses.length > 0 && (
        <div className="admin-highlight">
          <div>
            <span>Donor Response Notification</span>
            <strong>{pendingDonorResponses.length} donor response(s) waiting for admin action</strong>
          </div>
          <div className="workflow-actions">
            <button className="primary-button" onClick={() => setSelectedRequestId(pendingDonorResponses[0].id)} type="button">
              <FaExclamationTriangle /> Review
            </button>
          </div>
        </div>
      )}
      <div className="admin-manage-grid">
        <form className="form-panel" onSubmit={saveRequest}>
          <h2>Add Request</h2>
          <label>Requester<input onChange={(e) => updateField("requester", e.target.value)} placeholder="Patient or hospital name" required value={requestForm.requester} /></label>
          <label>Blood Group<select onChange={(e) => updateField("bloodGroup", e.target.value)} value={requestForm.bloodGroup}><option>A+</option><option>O+</option><option>B+</option><option>AB+</option></select></label>
          <label>Units Needed<select onChange={(e) => updateField("units", e.target.value)} value={requestForm.units}><option>1</option><option>2</option><option>3</option></select></label>
          <label>Hospital / Location<input onChange={(e) => updateField("hospital", e.target.value)} placeholder="Kandy General Hospital" required value={requestForm.hospital} /></label>
          <label>Type<select onChange={(e) => updateField("type", e.target.value)} value={requestForm.type}><option>Normal</option><option>Emergency</option></select></label>
          <label>Status<select onChange={(e) => updateField("status", e.target.value)} value={requestForm.status}><option>Pending</option><option>Approved</option><option>Completed</option><option>Rejected</option></select></label>
          <button className="primary-button full-width" type="submit">Save Request</button>
        </form>
        <section className="table-panel">
          <h3>Request Records From Users and Donors</h3>
          <table className="data-table">
            <thead><tr><th>Requester</th><th>Blood</th><th>Units</th><th>Type</th><th>Notify</th><th>Assigned Donor</th><th>Donor Response</th><th>User Update</th><th>Status</th></tr></thead>
            <tbody>
              {requestRows.map((request) => (
                <tr className={selectedRequest?.id === request.id ? "selected-row" : ""} key={request.id} onClick={() => setSelectedRequestId(request.id)}>
                  <td>{request.requester}</td>
                  <td>{request.bloodGroup}</td>
                  <td>{request.units}</td>
                  <td>{request.type}</td>
                  <td><StatusBadge status={request.notificationStatus || "Not Sent"} /></td>
                  <td>{request.assignedDonor || "-"}</td>
                  <td><StatusBadge status={request.donorResponse || "Waiting"} /></td>
                  <td><StatusBadge status={request.userNotificationStatus || "Not Sent"} /></td>
                  <td><StatusBadge status={request.status || "Pending"} /></td>
                </tr>
              ))}
              {requestRows.length === 0 && (
                <tr>
                  <td className="empty-table-cell" colSpan="9">
                    No blood requests yet. User and donor submissions will appear here first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
      {pendingDonorResponses.length > 0 && (
        <section className="request-workflow-panel">
          <div>
            <h3>Donor Responses Waiting</h3>
            <p>Accepted and rejected donor replies appear here as soon as the donor responds.</p>
          </div>
          <div className="notification-list">
            {pendingDonorResponses.map((request) => (
              <article className="notification-card" key={request.id}>
                <div>
                  <strong>{request.assignedDonor || "Assigned donor"} {request.donorResponse.toLowerCase()}</strong>
                  <span>{request.bloodGroup} request for {request.requester}</span>
                  <span>{request.units} unit(s) at {request.hospital || "not specified"}</span>
                </div>
                <div className="workflow-actions">
                  <StatusBadge status={request.donorResponse} />
                  <button onClick={() => setSelectedRequestId(request.id)} type="button">Review</button>
                  <button className="primary-button" onClick={() => sendDonorResponseToUser(request)} type="button">
                    Send to User
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {selectedRequest && (
        <section className="request-workflow-panel">
          <div>
            <h3>Analyse Request and Notify Matching Donors</h3>
            <p>
              Selected request: {selectedRequest.bloodGroup}, {selectedRequest.units} unit(s), {selectedRequest.hospital || selectedRequest.requester}
            </p>
          </div>
          {reservedInventory.length > 0 && (
            <div className="inventory-request-alert">
              <FaExclamationTriangle />
              <p>
                {reservedInventory.length} reserved {selectedRequest.bloodGroup} stock record(s) already exist for this blood group.
                Check reserved inventory before assigning this request.
              </p>
            </div>
          )}
          {availableInventory.length > 0 && (
            <p className="table-helper">
              {availableInventory.reduce((total, item) => total + Number(item.units || 0), 0)} available {selectedRequest.bloodGroup} unit(s) are recorded in Blood Inventory.
            </p>
          )}
          <div className="matching-donor-grid">
            {matchingDonors.map((donor) => (
              <article className="matching-donor-card" key={donor.id}>
                <div>
                  <strong>{donor.name}</strong>
                  <span>{donor.bloodGroup} • {donor.location}</span>
                  <span>{donor.phone || "No phone added"}</span>
                </div>
                <div className="workflow-actions">
                  <button className="primary-button" onClick={() => notifyDonor(selectedRequest, donor)} type="button">Send Notification</button>
                </div>
              </article>
            ))}
            {matchingDonors.length === 0 && (
              <p className="empty-state">No available donor records match this blood group. Add donors in Manage Donors first.</p>
            )}
          </div>
          <div className="donor-response-actions">
            <span>Donor reply update:</span>
            <button onClick={() => sendDonorResponseToUser(selectedRequest, "Accepted")} type="button">Accepted</button>
            <button onClick={() => sendDonorResponseToUser(selectedRequest, "Rejected")} type="button">Rejected</button>
          </div>
          {["Accepted", "Rejected"].includes(selectedRequest.donorResponse) && (
            <div className="donor-response-actions">
              <span>Send donor response to user:</span>
              <StatusBadge status={selectedRequest.userNotificationStatus || "Not Sent"} />
              <button onClick={() => sendDonorResponseToUser(selectedRequest)} type="button">
                Send {selectedRequest.donorResponse} Response
              </button>
            </div>
          )}
        </section>
      )}
    </section>
  );
}

// Admin shortcut for creating blood requests from the dashboard.
function AdminBloodRequestSection() {
  return (
    <section className="admin-form-page">
      <h2 className="welcome-title">Blood Request</h2>
      <p className="admin-section-copy">
        Create a blood request from the admin side for hospitals, patients, or urgent cases.
      </p>
      <BloodRequestForm title="Create Admin Blood Request" />
    </section>
  );
}

// Admin inventory management. It tracks available units and expiry dates.
function BloodInventorySection() {
  const [inventoryForm, setInventoryForm] = useState({
    bloodGroup: "A+",
    units: "1",
    hospital: "",
    expiryDate: "",
    status: "Available",
  });
  const [inventoryRows, setInventoryRows] = useState([]);

  useEffect(() => {
    let mounted = true;
    apiFetch("/inventory")
      .then((data) => {
        if (mounted) setInventoryRows(data);
      })
      .catch((error) => console.error("Failed to load inventory:", error));

    return () => {
      mounted = false;
    };
  }, []);

  const updateField = (field, value) => {
    setInventoryForm((current) => ({ ...current, [field]: value }));
  };

  const saveInventory = async (event) => {
    event.preventDefault();
    try {
      const created = await apiFetch("/inventory", {
        method: "POST",
        body: JSON.stringify({ ...inventoryForm, units: Number(inventoryForm.units) }),
      });
      setInventoryRows((existing) => [created, ...existing]);
      setInventoryForm({
        bloodGroup: "A+",
        units: "1",
        hospital: "",
        expiryDate: "",
        status: "Available",
      });
    } catch (error) {
      console.error("Failed to save inventory:", error);
      alert("Unable to save inventory. Please try again.");
    }
  };

  const getInventoryStatus = (item) => {
    const alert = getInventoryAlert(item);
    return alert.status === "Expired" ? "Expired" : item.status;
  };

  const updateInventoryStatus = async (item, status) => {
    try {
      const updated = await apiFetch(`/inventory/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setInventoryRows((existing) => existing.map((row) => (row.id === item.id ? updated : row)));
    } catch (error) {
      console.error("Failed to update inventory status:", error);
      alert("Unable to update inventory status. Please try again.");
    }
  };

  return (
    <section className="admin-manage-page">
      <div className="admin-section-head">
        <div>
          <h2 className="welcome-title">Blood Inventory</h2>
          <p>Add and track blood stock with expiry dates in MySQL. Admin expiry notifications are created from these records.</p>
        </div>
      </div>
      <div className="admin-manage-grid">
        <form className="form-panel" onSubmit={saveInventory}>
          <h2>Add Blood Stock</h2>
          <label>Blood Group<select onChange={(e) => updateField("bloodGroup", e.target.value)} value={inventoryForm.bloodGroup}><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option></select></label>
          <label>Units<input min="0" onChange={(e) => updateField("units", e.target.value)} required type="number" value={inventoryForm.units} /></label>
          <label>Hospital / Blood Bank<input onChange={(e) => updateField("hospital", e.target.value)} placeholder="Kandy General Hospital" required value={inventoryForm.hospital} /></label>
          <label>Expiry Date<input onChange={(e) => updateField("expiryDate", e.target.value)} required type="date" value={inventoryForm.expiryDate} /></label>
          <label>Status<select onChange={(e) => updateField("status", e.target.value)} value={inventoryForm.status}><option>Available</option><option>Reserved</option><option>Expired</option></select></label>
          <button className="primary-button full-width" type="submit">Save Inventory</button>
        </form>
        <section className="table-panel">
          <h3>Inventory Records</h3>
          <table className="data-table">
            <thead><tr><th>Blood</th><th>Units</th><th>Hospital</th><th>Expiry</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {inventoryRows.map((item) => {
                const displayStatus = getInventoryStatus(item);
                const isExpired = displayStatus === "Expired";
                return (
                  <tr key={item.id}>
                    <td>{item.bloodGroup}</td>
                    <td>{item.units}</td>
                    <td>{item.hospital}</td>
                    <td>{item.expiryDate}</td>
                    <td><StatusBadge status={displayStatus} /></td>
                    <td>
                      <div className="workflow-actions">
                        {item.status === "Reserved" ? (
                          <button
                            className="outline-button"
                            disabled={isExpired}
                            onClick={() => updateInventoryStatus(item, "Available")}
                            type="button"
                          >
                            Make Available
                          </button>
                        ) : (
                          <button
                            className="primary-button"
                            disabled={isExpired || item.status === "Expired"}
                            onClick={() => updateInventoryStatus(item, "Reserved")}
                            type="button"
                          >
                            Reserve
                          </button>
                        )}
                        {item.status !== "Expired" && (
                          <button
                            className="outline-button"
                            onClick={() => updateInventoryStatus(item, "Expired")}
                            type="button"
                          >
                            Mark Expired
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {inventoryRows.length === 0 && (
                <tr>
                  <td className="empty-table-cell" colSpan="6">
                    No blood inventory records yet. Add stock from the form and it will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </section>
  );
}

// Admin users section. It lists registered users and admin accounts.
function UsersSection() {
  const [users, setUsers] = useState([]);
  const [userFilters, setUserFilters] = useState({
    bloodGroup: "All",
    location: "",
  });

  useEffect(() => {
    let mounted = true;
    apiFetch("/users")
      .then((data) => {
        if (mounted) setUsers(data);
      })
      .catch((error) => console.error("Failed to load users:", error));

    return () => {
      mounted = false;
    };
  }, []);

  const updateFilter = (field, value) => {
    setUserFilters((current) => ({ ...current, [field]: value }));
  };

  const filteredUsers = uniqueRowsByText(users, (user) => user.fullName).filter((user) => {
    const matchesBlood = userFilters.bloodGroup === "All" || user.bloodGroup === userFilters.bloodGroup;
    const matchesLocation = !userFilters.location || user.location?.toLowerCase().includes(userFilters.location.toLowerCase());

    return matchesBlood && matchesLocation;
  });

  return (
    <section className="table-panel wide">
      <h2 className="welcome-title">Users and Admins</h2>
      <div className="filter-bar user-filter-bar">
        <label>Blood Group<select onChange={(e) => updateFilter("bloodGroup", e.target.value)} value={userFilters.bloodGroup}><option>All</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>O+</option><option>O-</option><option>AB+</option><option>AB-</option></select></label>
        <label>Location<input onChange={(e) => updateFilter("location", e.target.value)} placeholder="Kandy" value={userFilters.location} /></label>
      </div>
      <p className="table-helper">{filteredUsers.length} user record(s) found.</p>
      <table className="data-table">
        <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Blood</th><th>Location</th><th>Status</th></tr></thead>
        <tbody>
          {filteredUsers.map((user) => (
            <tr key={user.id}>
              <td>{user.fullName}</td>
              <td>{user.username}</td>
              <td>{user.role}</td>
              <td>{user.bloodGroup || "-"}</td>
              <td>{user.location || "-"}</td>
              <td><StatusBadge status={user.status || "Active"} /></td>
            </tr>
          ))}
          {filteredUsers.length === 0 && (
            <tr>
              <td className="empty-table-cell" colSpan="6">
                No users match the selected blood group and location.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

// Admin landing overview with totals, recent activity, and alert shortcut.
function AdminOverview({ onManageRequests }) {
  const [donorCount, setDonorCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [requestRows, setRequestRows] = useState([]);
  const [inventoryRows, setInventoryRows] = useState([]);

  const loadOverviewData = useCallback(async () => {
    const [donorsData, requestsData, inventoryData] = await Promise.all([
      apiFetch("/donors"),
      apiFetch("/requests"),
      apiFetch("/inventory"),
    ]);

    setDonorCount(uniqueRowsByText(donorsData, (donor) => donor.name).length);
    setRequestCount(requestsData.filter((request) => request.status !== "Completed").length);
    setRequestRows(requestsData);
    setInventoryRows(inventoryData);
  }, []);

  useEffect(() => {
    let mounted = true;

    const refresh = () => {
      loadOverviewData()
        .catch((error) => {
          if (mounted) console.error("Failed to load admin overview:", error);
        });
    };

    refresh();
    const intervalId = setInterval(refresh, 8000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [loadOverviewData]);

  const totalUnits = inventoryRows.reduce((total, item) => total + Number(item.units || 0), 0);
  const alertCount = inventoryRows.filter((item) => {
    const alert = getInventoryAlert(item);
    return alert.status === "Expiring Soon" || alert.status === "Expired";
  }).length;
  const donorResponsesToSend = requestRows.filter((request) => (
    ["Accepted", "Rejected"].includes(request.donorResponse)
    && request.userNotificationStatus !== "Sent"
  ));
  const donorResponsesToSendCount = donorResponsesToSend.length;

  return (
    <>
      <h2 className="welcome-title">Admin Dashboard</h2>
      <div className="admin-highlight">
        <div>
          <span>Donor Response Notification</span>
          <strong>{donorResponsesToSendCount} donor response(s) waiting to send to users</strong>
        </div>
        <button className="primary-button" onClick={onManageRequests} type="button">
          <FaExclamationTriangle /> Review Responses
        </button>
      </div>
      <div className="metric-grid">
        <Metric icon={FaUsers} value={donorCount} label="Total Donors" />
        <Metric icon={FaTint} value={requestCount} label="Active Requests" />
        <Metric icon={FaFlask} value={totalUnits} label="Blood Units" />
        <Metric icon={FaExclamationTriangle} value={alertCount} label="Expiry Alerts" warning />
        <Metric icon={FaHandHoldingMedical} value={donorResponsesToSendCount} label="Responses To Send" warning />
      </div>
      <div className="admin-bottom">
        <section className="table-panel">
          <h3>Requests Overview</h3>
          <RequestsTable />
        </section>
        <section className="chart-panel">
          <h3>Blood Group Availability</h3>
          <div className="donut-chart" />
          <div className="legend-list">
            {["A+ (25%)", "A- (15%)", "B+ (20%)", "O+ (25%)", "AB+ (10%)", "Others (5%)"].map((item) => (
              <span key={item}><i /> {item}</span>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

// Expiry alert screen. It highlights inventory that is expired or near expiry.
function ExpiryAlertsContent() {
  const [inventoryRows, setInventoryRows] = useState([]);

  useEffect(() => {
    let mounted = true;
    apiFetch("/inventory")
      .then((data) => {
        if (mounted) setInventoryRows(data);
      })
      .catch((error) => console.error("Failed to load expiry alerts:", error));

    return () => {
      mounted = false;
    };
  }, []);

  const rows = inventoryRows.map((item) => {
    const alert = getInventoryAlert(item);
    return {
      ...item,
      daysLeft: alert.daysLeft,
      alertStatus: alert.status,
    };
  });

  return (
    <section className="table-panel wide">
      <h2 className="welcome-title">Blood Expiry Alerts</h2>
      <table className="data-table">
        <thead>
          <tr>
            {["ID", "Blood Group", "Units", "Expiry Date", "Days Left", "Status"].map((head) => <th key={head}>{head}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.id}</td>
              <td>{row.bloodGroup}</td>
              <td>{row.units}</td>
              <td>{row.expiryDate}</td>
              <td>{row.daysLeft}</td>
              <td><StatusBadge status={row.alertStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="alert-note">
        <FaExclamationTriangle />
        <p>Alerts come from Blood Inventory records. Stock expiring within 7 days or already expired needs admin action.</p>
      </div>
    </section>
  );
}

export default AdminDashboard;
