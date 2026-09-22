import {
  FaBell,
  FaComments,
  FaExclamationTriangle,
  FaHandHoldingMedical,
  FaHome,
  FaIdCard,
  FaSignOutAlt,
  FaTint,
  FaUser,
  FaUserFriends,
  FaUsers,
} from "react-icons/fa";

// Donor sidebar menu items. Each item stores the visible label and the icon component.
export const donorMenu = [
  ["Dashboard", FaHome],
  ["My Profile", FaUser],
  ["My Donations", FaTint],
  ["Requests", FaHandHoldingMedical],
  ["Notifications", FaBell],
  ["Chat Support", FaComments],
  ["Logout", FaSignOutAlt],
];

// Normal user sidebar menu items. Users can request blood, track requests, and contact support.
export const userMenu = [
  ["Dashboard", FaHome],
  ["Blood Request", FaHandHoldingMedical],
  ["My Requests", FaTint],
  ["Find Donors", FaUsers],
  ["My Profile", FaUser],
  ["Chat Support", FaComments],
  ["Logout", FaSignOutAlt],
];

// Admin sidebar menu items. Admin has more management screens than donor.
export const adminMenu = [
  ["Dashboard", FaHome],
  ["Manage Donors", FaUsers],
  ["Manage Requests", FaHandHoldingMedical],
  ["Blood Request", FaTint],
  ["Blood Inventory", FaTint],
  ["Expiry Alerts", FaExclamationTriangle],
  ["Reports", FaIdCard],
  ["Users", FaUserFriends],
  ["Chat Support", FaComments],
  ["Logout", FaSignOutAlt],
];
