import { useState } from "react";
import SignupForm from "./SignupForm";
import { plans, features, monthlyCents, money } from "./pricing";
import "./pricing.css";

function Quantity({ label, value, onChange, min = 0, max = 100 }) {
  return <label className="rlc-quantity">
    <span>{label}</span>
    <input type="number" min={min} max={max} step="1" value={value}
      onChange={e => onChange(e.target.value)} required />
  </label>;
}
function FeatureValue({ value }) {
  if (value === true) return <span className="rlc-included">Included</span>;
  if (value === false) return <span className="rlc-excluded">Not included</span>;
  if (value === null) return <span>To be confirmed</span>;
  return value;
}
export default function App() {
  const [users, setUsers] = useState(1);
  const [plusRooms, setPlusRooms] = useState(0);
  const [proRooms, setProRooms] = useState(0);
  const [screen, setScreen] = useState("pricing");
  const valid = Number.isInteger(Number(users)) && Number(users) >= 1 && Number(users) <= 1000
    && [plusRooms, proRooms].every(v => v !== "" && Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 100);
  const total = valid ? monthlyCents(Number(users), Number(plusRooms), Number(proRooms)) : null;

  function continueSignup(e) {
    e.preventDefault();
    if (!valid) return;
    setScreen("signup");
    window.scrollTo(0, 0);
  }
  return <div className="rlc-page">
    <header className="rlc-header">
      <a href="#top" className="rlc-brand" onClick={() => setScreen("pricing")}>
        <img className="rlc-logo" src={`${import.meta.env.BASE_URL}real-life-connect-logo.png`} alt="Real Life Connect" width="2048" height="1026" />
      </a>
      <span className="rlc-header-note">Meet. Collaborate. Stay connected.</span>
    </header>
    <main id="top">
      {screen === "pricing" ? <>
        <section className="rlc-hero">
          <p className="rlc-eyebrow">REAL LIFE CONNECT / PLANS & PRICING</p>
          <h1>A meeting space for every conversation.</h1>
          <p>Start with a personal Basic account for each user. Add shared Plus or Pro rooms when your organization needs more.</p>
          <a className="rlc-text-link" href="#compare">Compare all features <span aria-hidden="true">↓</span></a>
        </section>
        <section className="rlc-cards" aria-label="Subscription options">
          {plans.map((p, index) => <article className={index === 2 ? "rlc-card rlc-card-pro" : "rlc-card"} key={p.id}>
            <p className="rlc-eyebrow">{index === 0 ? "FOR EACH INDIVIDUAL" : "OPTIONAL SHARED ROOM"}</p>
            <h2>{p.name}</h2>
            <p className="rlc-price">{money(Math.round(p.price * 100))}<span> / month</span></p>
            <p className="rlc-unit">{index === 0 ? "Per account · one user" : "Per additional shared room"}</p>
            <p>{index === 0 ? "Your own space for everyday meetings." : index === 1 ? "Bring people together with recording and collaboration tools." : "Advanced production and AI tools for your important conversations."}</p>
            <ul>
              <li>Up to {p.participants} meeting participants</li>
              {index === 0 ? <><li>Audio recording</li><li>Meeting summaries & Smart Search</li><li>Screen sharing and whiteboard</li></> :
                index === 1 ? <><li>Video recording and breakout rooms</li><li>Polling and custom branding</li><li>YouTube streaming</li></> :
                <><li>Includes Plus features</li><li>Cue transcription & AI insights</li><li>Multi-camera broadcast</li></>}
            </ul>
            <a className={index === 2 ? "rlc-button rlc-button-orange" : "rlc-button"} href="#package">
              {index === 0 ? "Choose your user count" : "Add a " + p.name + " room"}
            </a>
          </article>)}
        </section>
        <section className="rlc-builder" id="package">
          <div><p className="rlc-eyebrow">BUILD YOUR ORGANIZATION PACKAGE</p>
            <h2>Your users. Your rooms.</h2>
            <p>Every Basic account belongs to one user. Shared rooms are additional subscriptions for your organization.</p>
            <p className="rlc-small">Shared-room booking and hosting are in development. Assigned-user limits will be confirmed before checkout is enabled.</p>
          </div>
          <form onSubmit={continueSignup}>
            <Quantity label="Basic users · $5.99 each/month" value={users} onChange={setUsers} min={1} max={1000} />
            <Quantity label="Shared Plus rooms · $16.99 each/month" value={plusRooms} onChange={setPlusRooms} />
            <Quantity label="Shared Pro rooms · $24.99 each/month" value={proRooms} onChange={setProRooms} />
            <div className="rlc-total"><span>Monthly subtotal</span><strong>{total === null ? "—" : money(total)}</strong></div>
            <p className="rlc-small">USD. Before applicable taxes and separately charged services.</p>
            <button className="rlc-button rlc-button-orange" type="submit" disabled={!valid}>Continue to signup</button>
            <p className="rlc-small">Development preview. No payment is collected.</p>
          </form>
        </section>
        <section id="compare" className="rlc-comparison">
          <p className="rlc-eyebrow">THE DETAILS, SIDE BY SIDE</p>
          <h2>Find the features you need.</h2>
          <p>Basic is an individual account. Plus and Pro columns describe the additional shared-room plans.</p>
          <div className="rlc-table-wrap" role="region" aria-label="Plan feature comparison" tabIndex={0}>
            <table>
              <caption className="rlc-sr-only">Real Life Connect plan features</caption>
              <thead><tr><th scope="col">Feature</th>{plans.map(p => <th scope="col" key={p.id}>{p.name}<small>{p.participants} participants</small></th>)}</tr></thead>
              <tbody>{features.map(([name, ...values]) => <tr key={name}><th scope="row">{name}</th>{values.map((value, i) =>
                <td key={plans[i].id}><FeatureValue value={value} /></td>)}</tr>)}</tbody>
            </table>
          </div>
          <aside className="rlc-notes">
            <p><strong>Separately charged services:</strong> Telephone-network audio conferencing requires an additional voice plan or usage billing. SMS invitations and reminders carry additional charges where available. Call-out rates must be confirmed before use.</p>
            <p><strong>Feature clarification:</strong> Basic support for a second camera and unique participant codes is awaiting confirmation. “Secure Meetings” is a named plan feature; its absence does not mean Basic has no security protections.</p>
            <p>YouTube streaming and the Pro-only “Live streaming” feature are listed separately in the reseller feature table. Their exact distinction will be confirmed before launch.</p>
          </aside>
        </section>
      </> : <section className="rlc-signup">
        <button className="rlc-back" onClick={() => setScreen("pricing")}>← Back to plans</button>
        <p className="rlc-eyebrow">YOUR SELECTED PACKAGE</p>
        <h1>Let’s get your organization started.</h1>
        <p>{users} Basic user(s) · {plusRooms} shared Plus room(s) · {proRooms} shared Pro room(s)</p>
        <p><strong>{money(total)} per month</strong> before applicable taxes and usage charges.</p>
        <div className="rlc-notes" role="status">Development preview: this existing form tests signup only. Your package is shown here for review; Stripe checkout, permanent order storage, and Iotum activation are not connected yet.</div>
        <SignupForm />
      </section>}
    </main>
    <footer className="rlc-footer"><img className="rlc-footer-logo" src={`${import.meta.env.BASE_URL}real-life-connect-logo.png`} alt="Real Life Connect" width="2048" height="1026" loading="lazy" /><span>Real Life Systems, LLC</span></footer>
  </div>;
}
