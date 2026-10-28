export let plans = [
  { id: "basic", name: "Basic", price: 7.99, participants: 25, code: "reallife_basic" },
  { id: "plus", name: "Plus", price: 16.99, participants: 100, code: "reallife_plus" },
  { id: "pro", name: "Pro", price: 24.99, participants: 250, code: "reallife_pro" },
];

// Source: the reseller feature table supplied on October 27, 2026.
// Basic excludes every feature below Audio recording, as clarified by the owner.
export let features = [
  ["Meeting participants", 25, 100, 250],
  ["Virtual backgrounds", true, true, true],
  ["Screen sharing", true, true, true],
  ["Document sharing", true, true, true],
  ["Annotation and laser pointer", true, true, true],
  ["Whiteboard", true, true, true],
  ["APIs", true, true, true],
  ["Webhooks", true, true, true],
  ["In-meeting chat", true, true, true],
  ["Meeting scheduling", true, true, true],
  ["Meeting summaries & Smart Search", true, true, true],
  ["Waiting room", true, true, true],
  ["Moderator controls", true, true, true],
  ["Audio recording", true, true, true],
  ["Video recording", false, true, true],
  ["Custom hold music", false, true, true],
  ["Speaker spotlight", false, true, true],
  ["Share second camera", false, true, true],
  ["SMS invitations & reminders", false, "Usage charges apply", "Usage charges apply"],
  ["Company custom branding", false, true, true],
  ["Meeting lock", false, true, true],
  ["Secure Meetings feature", false, true, true],
  ["Unique participant codes", false, true, true],
  ["Enhanced caller ID", false, true, true],
  ["Private chat", false, true, true],
  ["Breakout rooms", false, true, true],
  ["Polling", false, true, true],
  ["Stage view", false, true, true],
  ["Call out to participants", false, true, true],
  ["Live streaming to YouTube", false, true, true],
  ["Dual monitor support", false, true, true],
  ["Live streaming", false, false, true],
  ["Instant breakout", false, false, true],
  ["Multi-camera broadcast", false, false, true],
  ["Cue meeting transcription & AI insights", false, false, true],
];
export function monthlyCents(users, plusRooms, proRooms) {
  return users * organizationUserCents + plusRooms * Math.round(plans[1].price * 100) + proRooms * Math.round(plans[2].price * 100);
}
export const money = cents => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD"
}).format(cents / 100);

export let organizationUserCents = 599;
export let usersPerSharedRoom = 10;
export function isOrganizationPackageValid(users, plusRooms, proRooms) {
  const values = [users, plusRooms, proRooms];
  if (!values.every(v => v !== "" && Number.isInteger(Number(v)))) return false;
  const [u, plus, pro] = values.map(Number);
  return u >= 1 && u <= 1000 && plus >= 0 && pro >= 0 && plus <= 100 && pro <= 100
    && plus + pro >= 1 && u <= usersPerSharedRoom * (plus + pro);
}


// Load once before rendering. Refresh the page after a local catalog update.
export function applyCatalog(catalog) {
  if (catalog.currency !== "USD" || !Array.isArray(catalog.plans) || catalog.plans.length !== 3 || !Array.isArray(catalog.features)) throw new Error("Invalid pricing response");
  plans = catalog.plans;
  features = catalog.features;
  organizationUserCents = catalog.organizationUserCents;
  usersPerSharedRoom = catalog.usersPerSharedRoom;
}
