// Small reusable card for landing/about page feature blocks.
function InfoCard({ icon: Icon, title, text }) {
  return (
    <article className="info-card">
      <Icon />
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

export default InfoCard;
