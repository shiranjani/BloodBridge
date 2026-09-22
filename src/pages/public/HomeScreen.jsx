import { FaHandHoldingMedical, FaHeart, FaSearch, FaShieldAlt, FaTint, FaUsers } from "react-icons/fa";
import homeBloodBridge from "../../assets/home-bloodbridge.png";
import InfoCard from "../../components/InfoCard";

// Landing page shown to first-time visitors.
function HomeScreen({ setActiveScreen }) {
  return (
    <section className="page home-page">
      <div className="hero-grid">
        <div className="hero-visual" aria-label="Blood donation illustration">
          <img src={homeBloodBridge} alt="Blood donors in Sri Lanka" />
        </div>
        <div className="hero-copy">
          <p className="eyebrow">Community blood donation system</p>
          <h1>Donate Blood Save Lives</h1>
          <p>
            Join our community of lifesavers. Your one donation can bring hope to
            someone in need.
          </p>
          <div className="hero-buttons">
            <button className="primary-button" onClick={() => setActiveScreen("donors")} type="button">
              <FaSearch /> Find Donors
            </button>
            <button className="outline-button" onClick={() => setActiveScreen("request")} type="button">
              <FaTint /> Request Blood
            </button>
          </div>
        </div>
      </div>

      <section className="why-band">
        <h2>Why Donate Blood?</h2>
        <div className="why-grid">
          <InfoCard icon={FaHeart} title="Save Lives" text="Your donation can save up to 3 lives." />
          <InfoCard icon={FaUsers} title="Help Community" text="Support patients in critical situations." />
          <InfoCard icon={FaShieldAlt} title="Safe & Secure" text="Your health and data are our priority." />
          <InfoCard icon={FaHandHoldingMedical} title="Be a Hero" text="Every donation makes you a hero." />
        </div>
      </section>

      <footer className="home-footer">
        <div>
          <h2><FaTint /> Blood Bridge</h2>
          <p>Connecting donors, hospitals, and patients when every minute matters.</p>
        </div>
        <div>
          <h3>Quick Links</h3>
          <button onClick={() => setActiveScreen("donors")} type="button">Find Donors</button>
          <button onClick={() => setActiveScreen("request")} type="button">Request Blood</button>
          <button onClick={() => setActiveScreen("chat")} type="button">Chat Support</button>
        </div>
        <div>
          <h3>Contact</h3>
          <p>Kandy, Sri Lanka</p>
          <p>support@bloodbridge.lk</p>
          <p>077 123 4567</p>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Blood Bridge. All rights reserved.</span>
        </div>
      </footer>
    </section>
  );
}

export default HomeScreen;
