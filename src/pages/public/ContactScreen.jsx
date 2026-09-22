// Static contact page with support details.
function ContactScreen() {
  return (
    <section className="page info-page">
      <div className="info-hero">
        <p className="eyebrow">Contact Us</p>
        <h1>Reach Blood Bridge support anytime.</h1>
        <p>Use these contact details for general help, donor coordination, or request support.</p>
      </div>
      <div className="contact-list">
        <article>
          <strong>Location</strong>
          <span>Kandy, Sri Lanka</span>
        </article>
        <article>
          <strong>Email</strong>
          <span>support@bloodbridge.lk</span>
        </article>
        <article>
          <strong>Phone</strong>
          <span>077 123 4567</span>
        </article>
      </div>
    </section>
  );
}

export default ContactScreen;
