import { useEffect, useState } from "react";
import { FaSearch, FaUserCircle } from "react-icons/fa";
import { apiFetch } from "../services/api";

// Donor search page. Users can filter available donors by blood group and location.
function DonorSearch() {
  const [donorRows, setDonorRows] = useState([]);
  const [isLoadingDonors, setIsLoadingDonors] = useState(true);
  const [filters, setFilters] = useState({ bloodGroup: "All", location: "" });

  useEffect(() => {
    let mounted = true;
    apiFetch("/donors")
      .then((data) => {
        if (mounted) setDonorRows(data);
      })
      .catch((error) => console.error("Failed to load donors:", error))
      .finally(() => {
        if (mounted) setIsLoadingDonors(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredDonors = donorRows.filter((donor) => {
    const matchesBlood = filters.bloodGroup === "All" || donor.bloodGroup === filters.bloodGroup;
    const matchesLocation = !filters.location || donor.location?.toLowerCase().includes(filters.location.toLowerCase());
    return matchesBlood && matchesLocation;
  });

  return (
    <section className="page compact-page">
      <div className="search-card">
        <div className="search-controls">
          <label>Blood Group<select onChange={(e) => setFilters((current) => ({ ...current, bloodGroup: e.target.value }))} value={filters.bloodGroup}><option>All</option><option>A+</option><option>A-</option><option>O+</option><option>O-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option></select></label>
          <label>Location<input onChange={(e) => setFilters((current) => ({ ...current, location: e.target.value }))} value={filters.location} /></label>
          <button className="primary-button" type="button"><FaSearch /> Search</button>
        </div>
        <h2>Available Donors</h2>
        {isLoadingDonors && <p className="table-helper">Loading donor records from MySQL...</p>}
        <div className="donor-list">
          {filteredDonors.map((donor) => (
            <article className="donor-item" key={donor.id}>
              <FaUserCircle className="donor-avatar" />
              <div>
                <h3>{donor.name} <span>{donor.bloodGroup}</span></h3>
                <p>Location: {donor.location || "Not added"}</p>
                <p>Last Donation: {donor.lastDonation || "Not added"}</p>
              </div>
            </article>
          ))}
          {!isLoadingDonors && filteredDonors.length === 0 && (
            <p className="empty-state">No donor records match your search. Registered donor profiles will appear here.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default DonorSearch;
