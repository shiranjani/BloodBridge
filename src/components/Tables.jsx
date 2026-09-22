import { requests } from "../data/sampleRequests";
import StatusBadge from "./StatusBadge";

// Static recent activity table for dashboard overview.
export function ActivityTable() {
  return (
    <section className="table-panel">
      <h3>Recent Activities</h3>
      <table className="data-table">
        <thead>
          <tr><th>Type</th><th>Description</th><th>Date</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td>Donation</td><td>Blood donated at Kandy General Hospital</td><td>2024-05-01</td><td><StatusBadge status="Completed" /></td></tr>
          <tr><td>Request Helped</td><td>Helped a patient (A+ Blood)</td><td>2024-04-20</td><td><StatusBadge status="Completed" /></td></tr>
        </tbody>
      </table>
    </section>
  );
}

// Static request table for overview display.
export function RequestsTable() {
  return (
    <table className="data-table">
      <thead>
        <tr><th>ID</th><th>Blood Group</th><th>Units</th><th>Type</th><th>Status</th></tr>
      </thead>
      <tbody>
        {requests.map(([id, group, units, type, status]) => (
          <tr key={id}>
            <td>{id}</td>
            <td>{group}</td>
            <td>{units}</td>
            <td className={type === "Emergency" ? "danger-text" : ""}>{type}</td>
            <td><StatusBadge status={status} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
