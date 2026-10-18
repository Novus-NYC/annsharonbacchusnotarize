import Header from "@/components/Header";
import SealFilm from "@/components/SealFilm";
import Route from "@/components/Route";
import Guilloche from "@/components/Guilloche";
import InView from "@/components/InView";
import CallBar from "@/components/CallBar";
import { notary, services, realEstate } from "@/lib/site";

function Tick() {
  return (
    <svg className="tick" viewBox="0 0 30 28" aria-hidden="true">
      <rect x="1" y="7" width="20" height="20" />
      <path d="M4.5 16.5c2.2 1.4 4 3.6 5.8 7.4C13.6 15.3 19.4 7.4 28 2.5" pathLength={1} />
    </svg>
  );
}

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <>
      <a className="skip" href="#services">
        Skip the introduction
      </a>
      <Header />
      <main id="top">
        <SealFilm />

        <section id="services" className="services" data-theme="light" aria-labelledby="services-title">
          <div className="services__head">
            <h2 id="services-title">What I notarize</h2>
            <p>I provide notary services for individuals, families and businesses, including:</p>
          </div>
          <InView as="ul" className="ledger">
            {services.map((s, i) => (
              <li className="ledger__row" key={s.name} style={{ "--i": i } as React.CSSProperties}>
                <Tick />
                <h3 className="ledger__name">{s.name}</h3>
                {s.note && <p className="ledger__note">{s.note}</p>}
              </li>
            ))}
          </InView>
        </section>

        <section id="mobile" className="mobile" data-theme="dark" aria-labelledby="mobile-title">
          <div className="mobile__intro">
            <h2 id="mobile-title">
              Need a notary? <span>I&rsquo;ll come to you.</span>
            </h2>
            <p>Convenient mobile service available at your home, office, hospital, or other agreed-upon location.</p>
            <a className="button button--gold" href={notary.phoneHref}>
              Call {notary.phone}
            </a>
          </div>
          <Route />
        </section>

        <section id="about" className="about" data-theme="light" aria-labelledby="about-title">
          <figure className="about__portrait">
            <img src="/media/ann-portrait.webp" width={632} height={940} alt="Portrait of Ann Sharon Bacchus" loading="lazy" />
            <figcaption>Ann Sharon Bacchus</figcaption>
          </figure>
          <div className="about__text">
            <h2 id="about-title">About me</h2>
            <p>
              I&rsquo;m Ann Sharon Bacchus, a Notary Public committed to reliable, convenient and courteous notary service
              for individuals, families and businesses.
            </p>
            <p>
              My goal is to make notarization simple, professional and stress-free, and to treat every client with
              respect, confidentiality and attention to detail.
            </p>
            <p>
              Whether you visit my office or need me to come to you, I&rsquo;m here to provide dependable notary service
              when you need it.
            </p>
            <p className="about__sign" aria-hidden="true">
              Ann Sharon Bacchus
            </p>
          </div>
        </section>

        <section id="faq" className="faq" data-theme="light" aria-labelledby="faq-title">
          <h2 id="faq-title">Frequently asked questions</h2>
          <p className="faq__tbd">To be determined.</p>
        </section>

        <section id="real-estate" className="estate" data-theme="light" aria-labelledby="estate-title">
          <div className="estate__head">
            <h2 id="estate-title">Real estate</h2>
            <blockquote className="estate__quote">
              <p>{realEstate.missions[0]}</p>
              <p>{realEstate.missions[1]}</p>
            </blockquote>
          </div>

          <div className="estate__lists">
            <div>
              <h3>For buyers</h3>
              <ul>
                {realEstate.buyers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>For sellers</h3>
              <ul>
                {realEstate.sellers.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>

          <address className="estate__card">
            <span className="estate__name">{realEstate.name}</span>
            <span>{realEstate.title}</span>
            <span className="estate__brokerage">{realEstate.brokerage}</span>
            <span>{realEstate.brokerageAddress}</span>
            <span>
              Cell <a href={notary.phoneHref}>{notary.phone}</a>
              <span className="estate__sep" aria-hidden="true" />
              Office <a href={realEstate.officePhoneHref}>{realEstate.officePhone}</a>
            </span>
            <a href={realEstate.website} target="_blank" rel="noreferrer">
              {realEstate.websiteLabel}
            </a>
            <small>Each office is independently owned and operated.</small>
          </address>
        </section>

        <section id="contact" className="contact" data-theme="dark" aria-labelledby="contact-title">
          <div className="contact__inner">
            <h2 id="contact-title">Need a notary? Call or text.</h2>
            <a className="contact__phone" href={notary.phoneHref}>
              {notary.phone}
            </a>
            <div className="contact__actions">
              <a className="button button--gold" href={notary.phoneHref}>
                Call
              </a>
              <a className="button button--ghost" href={notary.smsHref}>
                Send a text
              </a>
            </div>
            <dl className="contact__details">
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${notary.email}`}>{notary.email}</a>
                </dd>
              </div>
              <div>
                <dt>Office</dt>
                <dd>
                  {notary.street}
                  <br />
                  {notary.locality}, {notary.region} {notary.postalCode}
                  <br />
                  <a href={notary.mapsHref} target="_blank" rel="noreferrer">
                    Get directions
                  </a>
                </dd>
              </div>
              <div>
                <dt>Mobile service</dt>
                <dd>Home, office, hospital, or other agreed-upon location.</dd>
              </div>
            </dl>
          </div>
          <div className="contact__seal">
            <Guilloche className="contact__guilloche" />
            <img src="/media/ann-logo.webp" width={714} height={720} alt="Ann Sharon Bacchus, Notary Public logo" loading="lazy" />
          </div>
          <footer className="footer">
            <span>
              &copy; {year} {notary.name}, {notary.title}
            </span>
            <span>
              {notary.street}, {notary.locality}, {notary.region} {notary.postalCode}
            </span>
            <span>Made in Novus</span>
          </footer>
        </section>
      </main>
      <CallBar />
    </>
  );
}
