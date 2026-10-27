export const plans = [
  { id: "basic", name: "Basic", price: 5.99, participants: 25, code: "reallife_basic" },
  { id: "plus", name: "Plus", price: 16.99, participants: 100, code: "reallife_plus" },
  { id: "pro", name: "Pro", price: 24.99, participants: 250, code: "reallife_pro" },
];

// Source: the reseller feature table supplied on October 27, 2026.
// null means the supplied cell was blank; do not advertise it as included.
export const features = [
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
  ["Share second camera", null, true, true],
  ["SMS invitations & reminders", false, "Usage charges apply", "Usage charges apply"],
  ["Company custom branding", false, true, true],
  ["Meeting lock", false, true, true],
  ["Secure Meetings feature", false, true, true],
  ["Unique participant codes", null, true, true],
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
  return users * 599 + plusRooms * 1699 + proRooms * 2499;
}
export const money = cents => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD"
}).format(cents / 100);
