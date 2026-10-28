import { useState } from 'react';
import { plans, features, money, organizationUserCents, usersPerSharedRoom, monthlyCents } from './pricing';
import './marketing.css';

const image = name => `${import.meta.env.BASE_URL}images/${name}.webp`;
export function Action({ to = 'pricing', children, secondary = false }) {
  return <a className={`mc-action${secondary ? ' mc-action-secondary' : ''}`} href={`#${to}`}>{children}<span aria-hidden="true">↗</span></a>;
}
export function Photo({ name, alt, className = '', eager = false }) {
  return <img className={`mc-photo ${className}`} src={image(name)} alt={alt} width="1536" height="1024" loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} />;
}
function Icon({ kind }) {
  const paths = {
    video: <><rect x="3" y="6" width="12" height="12" rx="3"/><path d="m15 10 6-3v10l-6-3"/></>,
    rooms: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12M15 14h2m-2 3h2"/></>,
    webinar: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4m-2-12 5 3-5 3z"/></>,
    chat: <><path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2z"/><path d="M7 8h10M7 12h6"/></>,
    poll: <><path d="M4 3v18h17M8 17v-5m5 5V7m5 10v-7"/></>,
    board: <><rect x="3" y="3" width="18" height="15" rx="2"/><path d="m7 13 4-5 3 3 3-4M8 22l4-4 4 4"/></>,
    camera: <><rect x="2" y="4" width="11" height="9" rx="2"/><path d="m13 7 4-2v7l-4-2"/><rect x="9" y="14" width="10" height="7" rx="2"/><path d="m19 16 3-1v5l-3-1"/></>,
    share: <><path d="M12 16V3m-4 4 4-4 4 4M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/></>,
    record: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></>,
    people: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind] || paths.video}</svg>;
}
function SectionTitle({ eyebrow, title, children }) {
  return <div className="mc-section-title"><p className="mc-kicker">{eyebrow}</p><h2>{title}</h2>{children && <p>{children}</p>}</div>;
}
export function Closing() {
  return <section className="mc-closing"><div><p className="mc-kicker">LET’S MAKE ROOM FOR CONNECTION</p><h2>Your next conversation<br/>starts here.</h2><p>One person. A growing team. An audience ready to listen.</p></div><Action>Find your plan</Action></section>;
}
export function Home() {
  return <div className="mc-home">
    <section className="mc-hero">
      <div className="mc-hero-copy"><p className="mc-kicker"><span className="mc-dot"/> REAL PEOPLE. MEANINGFUL CONNECTIONS.</p><h1>Great things happen<br/>when we <em>connect.</em></h1><p>Bring your people together with video meetings, collaboration tools, and webinars. Your own meeting space—or advanced rooms your whole team can share.</p><div className="mc-actions"><Action>Explore plans</Action><a className="mc-underlink" href="#rooms">Meet our shared rooms <span aria-hidden="true">→</span></a></div><div className="mc-hero-footnote"><span>Individual plans from <strong>{money(Math.round(plans[0].price * 100))}/month</strong></span><span>One user. Your own room.</span></div></div>
      <div className="mc-hero-visual"><Photo name="connection" alt="Illustration of a business owner connecting with colleagues over a laptop video call" eager/><div className="mc-photo-tag"><span className="mc-tag-icon"><Icon kind="video"/></span><div><strong>A little closer. From anywhere.</strong><small>Video meetings for your real life.</small></div></div><span className="mc-photo-credit">AI-generated illustration</span></div>
    </section>
    <section className="mc-audience" aria-label="Who Real Life Connect serves"><span>MAKE SPACE FOR</span><p>Small businesses</p><i aria-hidden="true"/><p>Churches & nonprofits</p><i aria-hidden="true"/><p>Educators</p><i aria-hidden="true"/><p>Community groups</p></section>
    <section className="mc-section">
      <SectionTitle eyebrow="ONE CONNECTION. MORE POSSIBILITIES." title="The right space for every conversation.">From everyday check-ins to your next big event, choose the way you bring people together.</SectionTitle>
      <div className="mc-product-grid">{[
        ['01', 'video', 'Video meetings', 'Your room. Your conversations.', 'A personal meeting space for client calls, team check-ins, learning, and everything in between.', 'Explore meetings', 'meetings', `${plans[0].participants}–${plans[2].participants} participants`],
        ['02', 'rooms', 'Shared rooms', 'More capability. Shared by your team.', 'Give everyone a Basic account, then share advanced Plus or Pro rooms through a reservation calendar.', 'Discover shared rooms', 'rooms', 'Planned organization option'],
        ['03', 'webinar', 'Webinars & events', 'Your message. A bigger audience.', 'A planned event package for up to seven consecutive days, with an audience capacity that fits your event.', 'Explore webinars', 'webinars', 'One-time packages · in development'],
      ].map(([n,icon,title,subtitle,text,label,to,foot]) => <article className="mc-product" key={n}><div className="mc-product-top"><Icon kind={icon}/><span>{n}</span></div><h3>{title}</h3><strong>{subtitle}</strong><p>{text}</p><small>{foot}</small><a href={`#${to}`}>{label}<span aria-hidden="true">↗</span></a></article>)}</div>
    </section>
    <section className="mc-editorial"><div className="mc-editorial-photo"><Photo name="team" alt="Illustration of a small team collaborating around a laptop"/><div className="mc-photo-label">Built for the way your team connects.</div></div><div className="mc-editorial-copy"><p className="mc-kicker">A SMARTER WAY TO SHARE ADVANCED TOOLS</p><h2>Not everyone needs<br/>their own Pro room.<br/><em>Everyone needs access.</em></h2><p>Your whole team needs a place to meet. But advanced features may only be needed for some conversations. Our planned shared-room option gives you both.</p><ul className="mc-checks"><li>A personal Basic account for every assigned user</li><li>Shared Plus or Pro rooms for advanced meetings</li><li>Up to {usersPerSharedRoom} authorized users per shared room</li><li>One meeting per room at a time</li></ul><Action to="rooms">See how shared rooms work</Action><small className="mc-development">Shared-room booking and independent hosting are in development.</small></div></section>
    <CollaborationFeatures />
    <section className="mc-webinar-band"><div><p className="mc-kicker">A BIGGER STAGE FOR YOUR IDEAS</p><h2>One event.<br/>A room full of possibility.</h2><p>Workshops, training, community gatherings, and presentations. We’re designing webinar packages around your event—not an ongoing subscription.</p><Action to="webinars">Discover event packages</Action><small>Proposed packages · retail pricing to be finalized</small></div><Photo name="webinar" alt="Illustration of an educator presenting an online workshop from her studio"/></section>
    <section className="mc-section"><SectionTitle eyebrow="MAKE IT YOURS" title="Three ways to get started."/><div className="mc-start-grid"><article><span>FOR YOU</span><h3>Your personal meeting room.</h3><p>Choose Basic, Plus, or Pro. One user per plan, with your own room and no shared-room requirement.</p><a href="#pricing?individual">Compare individual plans →</a></article><article><span>FOR YOUR TEAM</span><h3>Personal accounts. Shared capability.</h3><p>Basic accounts for your users, with shared advanced rooms when your team needs them.</p><a href="#pricing?organization">Build a team package →</a></article><article><span>FOR YOUR EVENT</span><h3>A package with a clear finish.</h3><p>Up to seven consecutive days. A fixed event fee plus clearly disclosed usage charges.</p><a href="#webinars">Plan a webinar →</a></article></div></section>
    <Closing/>
  </div>;
}
function featurePlans(name) {
  const row = features.find(row => row[0] === name);
  const included = plans.filter((_, i) => row?.[i + 1] === true).map(p => p.name);
  return included.length ? included.join(' · ') : 'Availability to be confirmed';
}
export function CollaborationFeatures() {
  return <section className="mc-section mc-tools"><SectionTitle eyebrow="TEAMWORK, IN THE MEETING" title="Show it. Discuss it. Build it together.">Give your team more ways to participate, whether you’re sharing an idea, teaching a skill, or making a decision.</SectionTitle><div className="mc-tools-grid mc-collaboration-grid">{[
    ['share', 'Screen sharing', 'Walk through a presentation, demonstrate your work, or bring everyone onto the same page.', 'Screen sharing'],
    ['chat', 'In-meeting chat', 'Ask questions and share messages without interrupting the speaker. Private chat is an additional Plus and Pro feature.', 'In-meeting chat'],
    ['board', 'Whiteboards & annotation', 'Sketch an idea, map a process, and explain the details with a whiteboard, annotation, and laser pointer.', 'Whiteboard'],
    ['poll', 'Live polling', 'Invite your audience to weigh in. Use polls to check understanding, gather opinions, or guide the discussion.', 'Polling'],
    ['camera', 'Multiple camera views', 'Share a second camera with Plus or Pro. Choose Pro’s multi-camera broadcast for presentations that need more than one angle.', 'Multi-camera broadcast'],
    ['people', 'Breakout rooms', 'Give smaller groups their own space for focused discussions, training activities, and collaborative work.', 'Breakout rooms'],
  ].map(([icon, title, text, feature]) => <article key={title}><Icon kind={icon}/><h3>{title}</h3><p>{text}</p><small>{title === 'Multiple camera views' ? `Multi-camera broadcast: ${featurePlans(feature)}` : featurePlans(feature)}</small></article>)}</div><div className="mc-recording-note"><Icon kind="record"/><p><strong>Keep the important parts.</strong> Audio recording, meeting summaries, and Smart Search are in Basic. Plus adds video recording; Pro adds Cue transcription and AI insights.</p></div><a className="mc-underlink" href="#features">Compare every plan feature <span aria-hidden="true">→</span></a></section>;
}
export function Meetings({ children }) {
  return <><section className="mc-inner-hero"><div><p className="mc-kicker">REAL LIFE CONNECT / VIDEO MEETINGS</p><h1>Be in the room.<br/><em>Wherever you are.</em></h1><p>Meet with clients, collaborate with your team, or bring your community together. Choose a personal Basic, Plus, or Pro room that fits the way you work.</p><Action>Compare meeting plans</Action></div><Photo name="connection" alt="Illustration of a video meeting connecting a business owner and her colleagues" eager/></section><section className="mc-section"><SectionTitle eyebrow="BEFORE, DURING & AFTER" title="Keep your conversations moving."/><div className="mc-start-grid"><article><span>01 / PLAN</span><h3>Make time to connect.</h3><p>Use meeting scheduling to organize your next conversation and choose the right room for your audience.</p></article><article><span>02 / COLLABORATE</span><h3>Bring your ideas along.</h3><p>Share your screen and documents, use the whiteboard, and keep the conversation going in meeting chat.</p></article><article><span>03 / FOLLOW THROUGH</span><h3>Keep a useful record.</h3><p>Audio recording, summaries, and Smart Search are included in Basic. Compare plans for video recording and advanced AI features.</p></article></div></section><CollaborationFeatures/>{children}<Closing/></>;
}
export function SharedRoomStory() {
  return <section className="mc-room-story"><Photo name="team" alt="Illustration of colleagues working together around a laptop" eager/><div><p className="mc-kicker">A VIRTUAL RESOURCE YOUR TEAM SHARES</p><h2>A shared room is a meeting account.<br/>Not a physical space.</h2><p>Think of it like a shared conference room on your organization’s calendar. People have their own Basic accounts and take turns reserving an additional Plus or Pro room.</p><p>Five Basic users and one shared Pro room: <strong>{money(monthlyCents(5,0,1))}/month</strong>, before taxes and usage. Each Basic user costs {money(organizationUserCents)}/month within this package.</p><p className="mc-development">This organization option is being developed. Reservations and independent hosting must be verified before launch.</p></div></section>;
}
function dateLabel(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}
export function Webinars() {
  const [capacity, setCapacity] = useState('500');
  const [start, setStart] = useState('');
  const [summary, setSummary] = useState(null);
  function preview(e) {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !['500','1000','3000','5000'].includes(capacity)) return;
    const end = new Date(`${start}T00:00:00Z`);
    if (!Number.isFinite(end.getTime())) return;
    end.setUTCDate(end.getUTCDate() + 6);
    setSummary({capacity, start, end: end.toISOString().slice(0,10)});
  }
  return <><section className="mc-inner-hero"><div><p className="mc-kicker">REAL LIFE CONNECT / WEBINARS & EVENTS</p><h1>Your ideas deserve<br/><em>a bigger audience.</em></h1><p>Bring people together for a workshop, presentation, or several consecutive days of learning. Our planned webinar packages put the focus on your event.</p><a className="mc-action" href="#webinar-planner" onClick={e=>{e.preventDefault(); document.getElementById('webinar-planner').scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});document.getElementById('event-capacity').focus({preventScroll:true});}}>Explore your event options <span aria-hidden="true">↓</span></a><small className="mc-development">In development · purchasing is not enabled</small></div><Photo name="webinar" alt="Illustration of a webinar presenter speaking to her online audience" eager/></section>
    <section className="mc-section"><SectionTitle eyebrow="YOUR EVENT. A DEFINED PACKAGE." title="A simple way to plan your webinar."/><div className="mc-start-grid"><article><span>01 / AUDIENCE</span><h3>Choose your capacity.</h3><p>Planned packages support up to 500, 1,000, 3,000, or 5,000 attendees at one time. Capacity is not a limit on total registrations across the week.</p></article><article><span>02 / EVENT WINDOW</span><h3>One day. Or a full week.</h3><p>A package covers up to seven consecutive calendar days, with separate sessions during that period. Another package extends the event by another week.</p></article><article><span>03 / CLEAR COSTS</span><h3>Event fee plus usage.</h3><p>A flat fee based on audience capacity, plus disclosed charges for the additional services you use. No automatic renewal.</p></article></div></section>
    <section className="mc-event-planner" id="webinar-planner"><div><p className="mc-kicker">EXPLORE YOUR EVENT</p><h2>What are you bringing<br/>people together for?</h2><p>Preview a seven-day package window. Retail prices and service rates are still being finalized.</p><p>At the end of the package, event access, storage, and other services end. Download your recordings and files before the deadline; files are scheduled for deletion unless you purchase an extension.</p><p className="mc-development">This is a planning preview. It does not reserve dates, save an order, or collect payment. Expiration and file cleanup are not yet automated.</p></div><form onSubmit={preview}><label htmlFor="event-capacity">Maximum simultaneous attendees</label><select id="event-capacity" value={capacity} onChange={e=>{setCapacity(e.target.value);setSummary(null);}}>{['500','1000','3000','5000'].map(n=><option key={n} value={n}>Up to {Number(n).toLocaleString('en-US')} attendees</option>)}</select><label htmlFor="event-start">First event day</label><input id="event-start" type="date" required value={start} onChange={e=>{setStart(e.target.value);setSummary(null);}}/><div className="mc-planner-price"><span>Package price</span><strong>To be announced</strong></div><button className="mc-action" type="submit">Preview event window <span aria-hidden="true">→</span></button>{summary && <div className="mc-event-summary" role="status"><strong>Your event preview</strong><p>Up to {Number(summary.capacity).toLocaleString('en-US')} simultaneous attendees</p><p>{dateLabel(summary.start)} – {dateLabel(summary.end)}</p><p>Seven consecutive calendar days. No payment or reservation has been made. Exact expiration time and time zone will be confirmed before purchase.</p></div>}</form></section>
    <section className="mc-section mc-event-faq"><SectionTitle eyebrow="GOOD TO KNOW" title="Plan the event. Know what to expect."/>{[
      ['Is this an ongoing subscription?', 'The proposed event package is a one-time purchase with no automatic renewal. Recurring meeting plans are available separately.'],
      ['Can my webinar run on consecutive days?', 'That is the package we are designing: daily sessions within a seven-day window. Activation and scheduling behavior will be tested before we enable purchases.'],
      ['What could generate usage charges?', 'Transcription, SMS, telephone services, and storage may generate charges. Final customer rates and any included allowances will be shown before checkout.'],
      ['What happens to my recordings?', 'Download your recordings and other files before the package expires. Our planned policy ends storage and deletes event files at expiration unless an extension is purchased.'],
      ['Do I need a regular Real Life Connect subscription?', 'The event purchase is intended to be separate from an ongoing subscription. Any required host account will be included or disclosed in the final package before purchase.'],
    ].map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</section><Closing/></>;
}
