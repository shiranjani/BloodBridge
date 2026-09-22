import { useEffect, useState } from "react";
import { apiFetch } from "../../services/api";
import { donorMatchesRequest } from "../../utils/donorRequest";
import StatusBadge from "../../components/StatusBadge";

// Donor notification list. It shows requests assigned to the logged-in donor.
function DonorNotifications({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    Promise.all([apiFetch("/requests"), apiFetch("/donors")])
      .then(([requestsData, donorsData]) => {
        if (!mounted) return;
        const donorProfile = donorsData.find((donor) => donor.username === currentUser?.username);
        const assignedRequests = requestsData.filter((request) => (
          request.notificationStatus === "Sent"
          && donorMatchesRequest(currentUser, request, donorProfile)
        ));
        setNotifications(assignedRequests);
      })
      .catch((error) => {
        console.error("Failed to load donor notifications:", error);
        setMessage("Unable to load notifications.");
      });

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  const updateResponse = async (request, donorResponse) => {
    const status = donorResponse === "Accepted" ? "Donor Accepted" : "Donor Rejected";

    try {
      const updated = await apiFetch(`/requests/${request.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          donorResponse,
          status,
          userNotificationStatus: "Not Sent",
          userResponseMessage: "",
        }),
      });
      setNotifications((existing) => existing.map((item) => (item.id === request.id ? updated : item)));
      setMessage(`Response sent to admin: ${donorResponse}.`);
    } catch (error) {
      console.error("Failed to update donor response:", error);
      setMessage("Unable to send response. Please try again.");
    }
  };

  return (
    <section className="table-panel wide">
      <h2 className="welcome-title">Notifications</h2>
      <p className="table-helper">Admin-sent blood request notifications will appear here.</p>
      {message && <p className="form-message">{message}</p>}
      <div className="notification-list">
        {notifications.map((request) => (
          <article className="notification-card" key={request.id}>
            <div>
              <strong>{request.bloodGroup} blood needed</strong>
              <span>{request.units} unit(s) at {request.hospital || "not specified"}</span>
              <span>Requester: {request.requester}</span>
              <span>Type: {request.type}</span>
            </div>
            <div className="workflow-actions">
              <StatusBadge status={request.donorResponse || "Waiting"} />
              <button className="primary-button" onClick={() => updateResponse(request, "Accepted")} type="button">Accept</button>
              <button className="outline-button" onClick={() => updateResponse(request, "Rejected")} type="button">Reject</button>
            </div>
          </article>
        ))}
        {notifications.length === 0 && (
          <p className="empty-state">No donor notifications yet. Admin will send requests after analysis.</p>
        )}
      </div>
    </section>
  );
}

export default DonorNotifications;
