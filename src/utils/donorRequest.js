export function donorMatchesRequest(currentUser, request, donorProfile) {
  const userId = String(currentUser?.id || "");
  const donorProfileId = String(donorProfile?.id || "");
  const assignedDonorId = String(request?.assignedDonorId || "");
  const assignedName = request?.assignedDonor?.trim().toLowerCase();
  const userName = currentUser?.fullName?.trim().toLowerCase();
  const profileName = donorProfile?.name?.trim().toLowerCase();
  const userPhone = currentUser?.phone || "";
  const profilePhone = donorProfile?.phone || "";
  const donorPhone = request?.donorPhone || "";

  return Boolean(
    (assignedDonorId && (assignedDonorId === donorProfileId || assignedDonorId === userId))
    || (donorPhone && (donorPhone === profilePhone || donorPhone === userPhone))
    || (assignedName && (assignedName === profileName || assignedName === userName))
  );
}
