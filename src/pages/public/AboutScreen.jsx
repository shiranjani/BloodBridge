import { FaHeart, FaShieldAlt, FaUsers } from "react-icons/fa";
import InfoCard from "../../components/InfoCard";

// Static information page explaining the purpose of the system.
function AboutScreen() {
  return (
    <section className="page info-page">
      <div className="info-hero">
        <p className="eyebrow">About Blood Bridge</p>
        <h1>Connecting urgent blood needs with nearby donors.</h1>
        <p>
          Blood Bridge helps patients, hospitals, donors, and admins coordinate
          requests faster with clear donor records and request tracking.
        </p>
      </div>
      <div className="info-grid">
        <InfoCard icon={FaHeart} title="Our Mission" text="Make blood donation support easier to access during critical moments." />
        <InfoCard icon={FaUsers} title="Our Community" text="Bring donors and people in need into one simple, organized system." />
        <InfoCard icon={FaShieldAlt} title="Our Promise" text="Keep donor and request information structured, useful, and secure." />
      </div>
    </section>
  );
}

export default AboutScreen;
