import { FaTint } from "react-icons/fa";

// Returns the first page a user should see based on their role.
export function getHomeScreenForRole(role) {
  if (role === "admin") return "admin";
  if (role === "donor") return "donor";
  if (role === "user") return "user";
  return "home";
}

// Public site wrapper. It keeps navbar and footer around normal website pages.
function SiteFrame({ children, currentUser, onLogout, setActiveScreen }) {
  return (
    <div className="site-frame">
      <header className="landing-nav">
        <button className="brand-mark" onClick={() => setActiveScreen("home")} type="button">Blood Bridge</button>
        <div className="landing-links">
          <button onClick={() => setActiveScreen("home")} type="button">Home</button>
          <button onClick={() => setActiveScreen("about")} type="button">About Us</button>
          <button onClick={() => setActiveScreen("donors")} type="button">Donor Search</button>
          <button onClick={() => setActiveScreen("request")} type="button">Blood Request</button>
          <button onClick={() => setActiveScreen("contact")} type="button">Contact</button>
          <button onClick={() => setActiveScreen("chat")} type="button">Chat Support</button>
        </div>
        <div className="landing-actions">
          {currentUser ? (
            <>
              <button className="ghost-button" onClick={() => setActiveScreen(getHomeScreenForRole(currentUser.role))} type="button">
                Dashboard
              </button>
              <button className="outline-button" onClick={onLogout} type="button">
                Logout
              </button>
            </>
          ) : (
            <>
              <button className="ghost-button" onClick={() => setActiveScreen("login")} type="button">
                Login
              </button>
              <button className="outline-button" onClick={() => setActiveScreen("register")} type="button">
                Register
              </button>
            </>
          )}
        </div>
      </header>
      <div className="site-content">{children}</div>
      <SiteFooter setActiveScreen={setActiveScreen} />
    </div>
  );
}

// Shared footer for the public pages.
function SiteFooter({ setActiveScreen }) {
  return (
    <footer className="home-footer">
      <div>
        <h2><FaTint /> Blood Bridge</h2>
        <p>Connecting donors, hospitals, and patients when every minute matters.</p>
      </div>
      <div>
        <h3>Quick Links</h3>
        <button onClick={() => setActiveScreen("home")} type="button">Home</button>
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
  );
}

export default SiteFrame;
