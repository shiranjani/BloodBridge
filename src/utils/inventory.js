// Calculates expiry warning status for one blood inventory record.
export function getInventoryAlert(item) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(item.expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (Number.isNaN(daysLeft)) {
    return { daysLeft: "-", status: "Invalid Date" };
  }

  if (daysLeft < 0 || item.status === "Expired") {
    return { daysLeft, status: "Expired" };
  }

  if (daysLeft <= 7) {
    return { daysLeft, status: "Expiring Soon" };
  }

  return { daysLeft, status: "Safe" };
}
