import { FaTint } from "react-icons/fa";
import BloodRequestForm from "../components/BloodRequestForm";

// Public blood request screen. Users can submit a new blood request after login.
function BloodRequestScreen({ currentUser }) {
  return (
    <section className="page request-page">
      <div className="request-header">
        <div>
          <p className="eyebrow">Blood Bridge Request Center</p>
          <h1>Request Blood</h1>
          <p>Submit a request for yourself, a patient, or a hospital case after login.</p>
        </div>
        <div className="request-header-badge">
          <FaTint />
          <span>Normal and emergency requests</span>
        </div>
      </div>
      <div className="request-layout">
        <BloodRequestForm currentUser={currentUser} title="Create Blood Request" />
      </div>
    </section>
  );
}

export default BloodRequestScreen;
