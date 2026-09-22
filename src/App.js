import { useState } from "react";
import SiteFrame, { getHomeScreenForRole } from "./components/SiteFrame";
import AdminDashboard from "./pages/admin/AdminDashboard";
import LoginScreen from "./pages/auth/LoginScreen";
import RegisterScreen from "./pages/auth/RegisterScreen";
import BloodRequestScreen from "./pages/BloodRequestScreen";
import DonorDashboard from "./pages/donor/DonorDashboard";
import DonorSearch from "./pages/DonorSearch";
import ProfileView from "./pages/ProfileView";
import UserDashboard from "./pages/user/UserDashboard";
import AboutScreen from "./pages/public/AboutScreen";
import ChatSupportScreen from "./pages/public/ChatSupportScreen";
import ContactScreen from "./pages/public/ContactScreen";
import HomeScreen from "./pages/public/HomeScreen";
import "./App.css";

const screenComponents = {
  home: HomeScreen,
  about: AboutScreen,
  contact: ContactScreen,
  chat: ChatSupportScreen,
  login: LoginScreen,
  register: RegisterScreen,
  donor: DonorDashboard,
  user: UserDashboard,
  request: BloodRequestScreen,
  admin: AdminDashboard,
  donors: DonorSearch,
  profile: ProfileView,
};

// Main app controller. It decides which screen to show and keeps login state in memory.
function App() {
  const [activeScreen, setActiveScreen] = useState("home");
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingAuthScreen, setPendingAuthScreen] = useState("");

  // These screens need a logged-in user. Guests are redirected to login first.
  const protectedScreens = ["admin", "donor", "user", "request", "donors", "profile"];
  const roleHome = currentUser ? getHomeScreenForRole(currentUser.role) : "home";
  const guardedScreen = protectedScreens.includes(activeScreen) && !currentUser ? "login" : activeScreen;
  const showSiteChrome = !["admin", "donor", "user"].includes(guardedScreen);
  const CurrentScreen = screenComponents[guardedScreen] || HomeScreen;

  // After successful login, send admins/donors to their dashboards and normal users back to their pending page.
  const handleLogin = (user) => {
    setCurrentUser(user);
    if (user.role === "admin" || user.role === "donor" || user.role === "user") {
      setPendingAuthScreen("");
      setActiveScreen(getHomeScreenForRole(user.role));
      return;
    }

    setActiveScreen(pendingAuthScreen || "home");
    setPendingAuthScreen("");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveScreen("login");
  };

  const handleUserUpdate = (user) => {
    setCurrentUser(user);
  };

  // Central navigation guard. It prevents guests and wrong roles from opening protected dashboards.
  const navigate = (screen) => {
    if (protectedScreens.includes(screen) && !currentUser) {
      setPendingAuthScreen(screen);
      return setActiveScreen("login");
    }
    if (screen === "admin" && currentUser?.role !== "admin") return setActiveScreen(roleHome);
    if (screen === "donor" && currentUser?.role !== "donor") return setActiveScreen(roleHome);
    if (screen === "user" && currentUser?.role !== "user") return setActiveScreen(roleHome);
    setActiveScreen(screen);
  };

  const screenProps = {
    currentUser,
    onLogin: handleLogin,
    onLogout: handleLogout,
    onUserUpdate: handleUserUpdate,
    setActiveScreen: navigate,
  };

  return (
    <main className="app-shell">
      {showSiteChrome ? (
        <SiteFrame currentUser={currentUser} onLogout={handleLogout} setActiveScreen={navigate}>
          <CurrentScreen {...screenProps} />
        </SiteFrame>
      ) : (
        <CurrentScreen {...screenProps} />
      )}
    </main>
  );
}

export default App;
