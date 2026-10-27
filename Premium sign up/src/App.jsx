import { useEffect, useState } from "react";
import SignupForm from "./SignupForm";
import { plans, features, monthlyCents, money, isOrganizationPackageValid, usersPerSharedRoom } from "./pricing";
import "./pricing.css";

const pages = { home: "Home", features: "Features", rooms: "Shared Rooms", pricing: "Plans & Pricing", signup: "Signup" };
const logo = `${import.meta.env.BASE_URL}real-life-connect-logo.png`;
function readPage() {
  const key = window.location.hash.slice(1).split("?")[0];
  return Object.hasOwn(pages, key) ? key : "home";
}
function Link({ page, children, className = "rlc-button" }) {
  return <a className={className} href={"#" + page}>{children}</a>;
}
function FeatureValue({ value }) {
  if (value === true) return <span className="rlc-included">Included</span>;
  if (value === false) return <span className="rlc-excluded">Not included</span>;
  return value === null ? "To be confirmed" : value;
}
function Quantity({ label, value, onChange, min = 0, max = 100 }) {
  return <label className="rlc-quantity"><span>{label}</span><input type="number" min={min} max={max} step="1" value={value} onChange={e => onChange(e.target.value)} required /></label>;
}
function MeetingIllustration({ calendar = false }) {
  return <div className="rlc-illustration" role="img" aria-label={calendar ? "Illustration of a shared-room calendar with separate team reservations" : "Illustration of a video meeting bringing four people together"}>
    <div className="rlc-illustration-bar"><span className="rlc-live-dot" />{calendar ? "A room for your next conversation" : "Connected, wherever life happens"}</div>
    {calendar ? <div className="rlc-calendar-art">
      {["MON", "TUE", "WED"].map(day => <div className="rlc-calendar-day" key={day}><strong>{day}</strong><div className="rlc-calendar-slot">Team meeting</div><div className="rlc-calendar-open">Available</div><div className="rlc-calendar-slot rlc-slot-orange">Community planning</div></div>)}
    </div> : <div className="rlc-video-art">{["A", "J", "M", "T"].map((letter, i) => <div className={"rlc-person rlc-person-" + i} key={letter}><span>{letter}</span><small>{["Ideas", "Connection", "Collaboration", "Community"][i]}</small></div>)}</div>}
    <div className="rlc-art-caption">Product concept illustration</div>
  </div>;
}
function Comparison() {
  return <section className="rlc-comparison">
    <p className="rlc-eyebrow">THE DETAILS, SIDE BY SIDE</p><h2>Find the features you need.</h2>
    <p>Feature limits apply to the selected plan. One licensed user is the host account; guests count toward the meeting participant limit.</p>
    <div className="rlc-table-wrap" role="region" aria-label="Plan feature comparison" tabIndex={0}><table>
      <caption className="rlc-sr-only">Real Life Connect Basic, Plus and Pro features</caption>
      <thead><tr><th scope="col">Feature</th>{plans.map(p => <th scope="col" key={p.id}>{p.name}<small>{p.participants} participants</small></th>)}</tr></thead>
      <tbody>{features.map(([name, ...values]) => <tr key={name}><th scope="row">{name}</th>{values.map((v, i) => <td key={i}><FeatureValue value={v} /></td>)}</tr>)}</tbody>
    </table></div>
    <aside className="rlc-notes">
      <p>Telephone-network audio conferencing requires a separate voice plan or usage charges. SMS invitations and reminders carry additional charges. Call-out charges must be confirmed before use.</p>
      <p>Basic support for a second camera and unique participant codes is awaiting confirmation. “Secure Meetings” is a named feature, not a statement that Basic lacks security protections.</p>
      <p>YouTube streaming and Pro “Live streaming” are listed separately by the provider; the distinction is being confirmed.</p>
    </aside>
  </section>;
}
function Intro({ eyebrow, title, children }) {
  return <section className="rlc-hero"><p className="rlc-eyebrow">{eyebrow}</p><h1>{title}</h1>{children}</section>;
}
export default function App() {
  const [page, setPage] = useState(readPage);
  const [kind, setKind] = useState(() => window.location.hash.includes("?organization") ? "organization" : "individual");
  const [individualPlan, setIndividualPlan] = useState("basic");
  const [users, setUsers] = useState(5);
  const [plusRooms, setPlusRooms] = useState(0);
  const [proRooms, setProRooms] = useState(1);
  const [selection, setSelection] = useState(null);
  useEffect(() => {
    function navigate() {
      setPage(readPage());
      if (window.location.hash.includes("?organization")) setKind("organization");
      if (window.location.hash.includes("?individual")) setKind("individual");
    }
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  useEffect(() => {
    document.title = pages[page] + " | Real Life Connect";
    window.scrollTo(0, 0);
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [page]);
  const currentPlan = plans.find(p => p.id === individualPlan);
  const organizationValid = isOrganizationPackageValid(users, plusRooms, proRooms);
  const roomCount = Number(plusRooms) + Number(proRooms);
  const subtotal = kind === "individual" ? Math.round(currentPlan.price * 100) :
    organizationValid ? monthlyCents(Number(users), Number(plusRooms), Number(proRooms)) : null;

  function selectIndividual(id) {
    setIndividualPlan(id);
    setSelection({ kind: "individual", plan: id, total: Math.round(plans.find(p => p.id === id).price * 100) });
    window.location.hash = "signup";
  }
  function submitSelection(e) {
    e.preventDefault();
    if (kind === "organization" && !organizationValid) return;
    setSelection(kind === "individual" ? { kind, plan: individualPlan, total: subtotal } :
      { kind, users: Number(users), plusRooms: Number(plusRooms), proRooms: Number(proRooms), total: subtotal });
    window.location.hash = "signup";
  }

  return <div className="rlc-page">
    <a href="#main-content" className="rlc-skip" onClick={e => { e.preventDefault(); document.getElementById("main-content").focus(); }}>Skip to content</a>
    <header className="rlc-header">
      <a href="#home" className="rlc-brand"><img className="rlc-logo" src={logo} alt="Real Life Connect home" width="2048" height="1026" /></a>
      <nav aria-label="Main navigation">{["home", "features", "rooms", "pricing"].map(key => <a key={key} href={"#" + key} aria-current={page === key ? "page" : undefined}>{pages[key]}</a>)}</nav>
    </header>
    <main id="main-content" tabIndex={-1}>
      {page === "home" && <>
        <section className="rlc-home-hero">
          <Intro eyebrow="FOR WORK. FOR COMMUNITY. FOR REAL LIFE." title="Your own meeting space. More ways to connect.">
            <p>Bring your conversations together with video meetings, screen sharing, and collaboration tools. Choose your own plan or give your organization advanced rooms to share.</p>
            <div className="rlc-actions"><Link page="pricing" className="rlc-button rlc-button-orange">Explore plans</Link><Link page="rooms" className="rlc-text-link">Discover shared rooms →</Link></div>
          </Intro>
          <MeetingIllustration />
        </section>
        <section className="rlc-value-strip" aria-label="Ways to connect"><span>Personal meeting rooms</span><span>Tools for collaboration</span><span>Optional shared Plus & Pro rooms</span></section>
        <section className="rlc-section"><p className="rlc-eyebrow">MAKE THE CONVERSATION COUNT</p><h2>Meet, share, and follow through.</h2>
          <div className="rlc-highlights">{[
            ["Meet face to face", "Connect your team, meet with clients, or bring your community together with video meetings."],
            ["Work on the same page", "Share your screen and documents, sketch ideas on a whiteboard, and use in-meeting chat."],
            ["Keep a useful record", "Basic includes audio recording, meeting summaries, and Smart Search. Choose Plus for video recording or Pro for Cue transcription and AI insights."]
          ].map(([title, text], i) => <article key={title}><span className="rlc-feature-number">0{i + 1}</span><h3>{title}</h3><p>{text}</p></article>)}</div><Link page="features" className="rlc-text-link">Explore the features →</Link>
        </section>
        <section className="rlc-split-panel"><MeetingIllustration calendar /><div><p className="rlc-eyebrow">A DIFFERENT WAY TO EQUIP YOUR TEAM</p><h2>Personal accounts. Shared advanced tools.</h2><p>Not everyone needs an advanced room all day. Give each team member a Basic account, then add shared Plus or Pro rooms for the meetings that need more.</p><p>Our shared-room service is being developed with calendar reservations and up to 10 authorized Basic users per room.</p><Link page="rooms" className="rlc-button">How shared rooms work</Link></div></section>
        <section className="rlc-section"><p className="rlc-eyebrow">BUILT AROUND YOUR CONVERSATIONS</p><h2>For the people you bring together.</h2><div className="rlc-highlights">{[
          ["Businesses", "Client conversations, project check-ins, and team collaboration."],
          ["Churches & nonprofits", "Ministry planning, volunteer coordination, and community meetings."],
          ["Educators & community groups", "Workshops, mentoring, and collaborative learning."]
        ].map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></section>
        <section className="rlc-closing"><h2>Find the right space for your next meeting.</h2><Link page="pricing" className="rlc-button rlc-button-orange">See plans & pricing</Link></section>
      </>}
      {page === "features" && <>
        <Intro eyebrow="REAL LIFE CONNECT / FEATURES" title="Tools that keep people working together."><p>Start with the essentials in Basic, add collaboration and production tools with Plus, or choose Pro for advanced broadcasting and AI insights.</p></Intro>
        <div className="rlc-highlights rlc-section">{[
          ["Basic · everyday meetings", "25 participants, screen and document sharing, whiteboard, audio recording, summaries, and Smart Search."],
          ["Plus · more ways to collaborate", "100 participants, video recording, breakout rooms, polling, branding, and YouTube streaming."],
          ["Pro · advanced meetings", "250 participants, Plus features, instant breakout, multi-camera broadcast, and Cue transcription & AI insights."]
        ].map(([title, text]) => <article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div>
        <Comparison /><section className="rlc-closing"><h2>Choose the features that fit your work.</h2><Link page="pricing">Compare subscription options</Link></section>
      </>}
      {page === "rooms" && <>
        <Intro eyebrow="REAL LIFE CONNECT / SHARED ROOMS" title="Advanced rooms your team can share."><p>A personal Basic account for every user. Shared Plus or Pro rooms for the occasions when your team needs more.</p></Intro>
        <section className="rlc-split-panel"><div><h2>Equip the team without giving everyone a personal Pro room.</h2><p>Each team member keeps their own Basic meeting space. Authorized users reserve the organization’s additional Plus or Pro rooms at available times.</p><p>One shared room supports one meeting at a time and up to 10 assigned Basic users. Add rooms when your team grows or needs simultaneous meetings.</p></div><MeetingIllustration calendar /></section>
        <section className="rlc-section"><h2>How it is designed to work</h2><ol className="rlc-steps"><li><strong>Add your users.</strong> Every person who reserves or hosts a shared room needs their own paid Basic account.</li><li><strong>Choose your shared rooms.</strong> Add Plus, Pro, or a combination based on the features your organization needs.</li><li><strong>Assign access and reserve.</strong> Your administrator manages room assignments and booking limits; team members choose available times.</li><li><strong>Host and follow up.</strong> Assigned hosts are intended to start independently and receive access to permitted meeting results.</li></ol><aside className="rlc-notes">Shared-room reservations, independent hosting, and follow-up notifications are in development and must pass testing before this service launches.</aside></section>
        <section className="rlc-choice-grid"><article><h2>Your own room</h2><p>Choose an individual Basic, Plus, or Pro subscription when you want personal access without coordinating room reservations with coworkers.</p><Link page="pricing?individual">View individual plans</Link></article><article><h2>Your team’s shared room</h2><p>Choose an organization package when every user needs Basic and the team can take turns using advanced Plus or Pro features.</p><Link page="pricing?organization">Build an organization package</Link></article></section>
        <section className="rlc-example"><p className="rlc-eyebrow">A FIVE-PERSON EXAMPLE</p><h2>$54.94 per month</h2><p>Five Basic users at $5.99 each, plus one shared Pro room at $24.99. Five individual Pro subscriptions would total $124.95 per month.</p><p><strong>The tradeoff:</strong> five personal Basic rooms and one shared Pro meeting at a time, rather than five personal Pro rooms. Taxes and usage charges are additional.</p></section>
        <section className="rlc-section"><h2>Common questions</h2><details><summary>Does the 10-user limit include meeting guests?</summary><p>No. It limits authorized room users. Plus supports 100 meeting participants; Pro supports 250. Guests do not need a paid Basic account simply to attend.</p></details><details><summary>Does an administrator need a Basic account?</summary><p>Yes, if they reserve or host meetings in a shared room. All assigned room users need Basic accounts.</p></details><details><summary>Can we add another room before reaching 10 users?</summary><p>Yes. Add capacity whenever your team needs more availability or simultaneous meetings.</p></details></section>
      </>}
      {page === "pricing" && <>
        <Intro eyebrow="REAL LIFE CONNECT / PLANS & PRICING" title="Choose a plan for yourself. Or a package for your team."><p>All prices are monthly in USD. Individual plans include one user account and a personal meeting room. Shared rooms are optional additions to an organization package.</p></Intro>
        <div className="rlc-mode" role="group" aria-label="Subscription type"><button aria-pressed={kind === "individual"} onClick={() => setKind("individual")}>Individual plans</button><button aria-pressed={kind === "organization"} onClick={() => setKind("organization")}>Organization & shared rooms</button></div>
        {kind === "individual" ? <>
          <p className="rlc-lead">Your own room, ready when you are. No shared-room subscription required.</p>
          <section className="rlc-cards" aria-label="Individual subscription plans">{plans.map(p => <article key={p.id} className={p.id === "pro" ? "rlc-card rlc-card-pro" : "rlc-card"}><p className="rlc-eyebrow">ONE USER · PERSONAL ROOM</p><h2>{p.name}</h2><p className="rlc-price">{money(Math.round(p.price * 100))}<span> / month</span></p><p className="rlc-unit">Per user</p><ul><li>Up to {p.participants} meeting participants</li>{p.id === "basic" ? <><li>Audio recording</li><li>Summaries & Smart Search</li><li>Screen sharing and whiteboard</li></> : p.id === "plus" ? <><li>Video recording and breakout rooms</li><li>Polling and custom branding</li><li>YouTube streaming</li></> : <><li>Includes Plus features</li><li>Cue transcription & AI insights</li><li>Multi-camera broadcast</li></>}</ul><button className="rlc-button rlc-button-orange" onClick={() => selectIndividual(p.id)}>Choose {p.name}</button></article>)}</section>
        </> : <section className="rlc-builder"><div><p className="rlc-eyebrow">BASIC ACCOUNTS + SHARED ROOMS</p><h2>Build your organization package.</h2><p>Basic users are $5.99 each per month with at least one shared Plus or Pro room. Each user keeps a personal Basic room.</p><p>Each additional shared room supports up to {usersPerSharedRoom} assigned Basic users and one meeting at a time.</p><Link page="rooms" className="rlc-text-link">Why choose shared rooms? →</Link></div><form onSubmit={submitSelection}>
          <Quantity label="Basic users · $5.99 each/month" value={users} onChange={setUsers} min={1} max={1000} />
          <Quantity label="Shared Plus rooms · $16.99 each/month" value={plusRooms} onChange={setPlusRooms} />
          <Quantity label="Shared Pro rooms · $24.99 each/month" value={proRooms} onChange={setProRooms} />
          <p className="rlc-small">Room assignment capacity: {Number.isFinite(roomCount) ? roomCount * usersPerSharedRoom : 0} Basic users.</p>
          {!organizationValid && <p role="alert" className="rlc-validation">Enter whole-number quantities. Include at least one Basic user and one shared room, with at least one room per 10 users.</p>}
          <div className="rlc-total"><span>Monthly subtotal</span><strong>{subtotal === null ? "—" : money(subtotal)}</strong></div><p className="rlc-small">Before applicable taxes and separately charged services.</p><button type="submit" className="rlc-button rlc-button-orange" disabled={!organizationValid}>Continue with organization package</button>
        </form></section>}
        <aside className="rlc-notes">Development preview. Checkout is not enabled; selecting a plan does not charge you or activate a subscription.</aside>
        <Comparison />
      </>}
      {page === "signup" && <section className="rlc-signup"><Link page="pricing" className="rlc-back">← Back to plans</Link><p className="rlc-eyebrow">YOUR SELECTED SUBSCRIPTION</p>
        {selection ? <><h1>{selection.kind === "individual" ? "Your meeting space starts here." : "Bring your organization together."}</h1><p>{selection.kind === "individual" ? plans.find(p => p.id === selection.plan).name + " · one user · personal room" : selection.users + " Basic users · " + selection.plusRooms + " shared Plus rooms · " + selection.proRooms + " shared Pro rooms"}</p><p><strong>{money(selection.total)} per month</strong> before applicable taxes and usage charges.</p><div role="status" className="rlc-notes">Development test only. The form saves your signup details in SQLite. Plan selections are currently a preview and are not saved as an order. No payment is collected and no Iotum subscription is activated.</div><SignupForm key={selection.kind + (selection.plan || "")} accountType={selection.kind} /></> :
          <><h1>Choose your subscription first.</h1><p>Return to pricing to select an individual plan or organization package.</p><Link page="pricing">Choose a subscription</Link></>}
      </section>}
    </main>
    <footer className="rlc-footer"><img className="rlc-footer-logo" src={logo} alt="Real Life Connect" width="2048" height="1026" loading="lazy" /><nav aria-label="Footer navigation"><Link page="features" className="">Features</Link><Link page="rooms" className="">Shared Rooms</Link><Link page="pricing" className="">Pricing</Link></nav><span>Real Life Systems, LLC</span></footer>
  </div>;
}
