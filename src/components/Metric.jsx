// Dashboard metric tile used for counts and alert totals.
function Metric({ icon: Icon, value, label, warning = false }) {
  return (
    <article className="metric-card">
      <Icon className={warning ? "warning-icon" : ""} />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

export default Metric;
