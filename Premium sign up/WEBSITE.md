# Real Life Connect website

The existing Vite app now includes Home, Meetings, Shared Rooms, Webinars, Features, Pricing and Signup pages. Hash navigation preserves the current hosting setup. Marketing takes its product-first structure from the Callbridge reference but uses original copy, layout and assets. No competitor endorsements, customer testimonials or unsupported security claims are included.

## Preview in Codespaces

Keep the backend running with `npm start` in `Real Life Connect _signup`. Keep Vite running with `npm run dev` in `Premium sign up`, then open forwarded port 5173. The website reads `/api/catalog` through the existing Vite proxy; a missing backend displays an unavailable message. Do not expose the backend port publicly.

Prices and feature rows still come from SQLite. Supplier costs are never sent to the browser. Meeting choices lead to the existing development signup, without payment or account activation. Webinar selections preview a seven-day inclusive calendar window, including across month/year boundaries. Dates and capacity are not reserved or saved; no payment is collected. Webinar retail rates are unset. Shared reservations, independent hosting, event expiration and file deletion are future implementation work.

## Images

Built-in image generation produced three original editorial-style photographs. Final web assets are in `public/images/connection.webp`, `public/images/team.webp`, and `public/images/webinar.webp` (1536 × 1024, approximately 380 KB combined). They depict illustrative people, not actual customers. Header and footer retain the supplied official logo. Images are disclosed as AI-generated in the footer and hero caption.

Final generation prompts:

### connection.webp

Use case: photorealistic-natural. Asset type: wide 3:2 marketing website photograph for Real Life Connect. A candid, warmly lit modern community workspace: a Black woman business owner in her late 30s at a walnut table, laughing naturally during a video meeting on an open laptop, angled laptop screen showing a believable small gallery of four diverse adult colleagues without readable UI text. A plant, ceramic mug and notebook, bright window and warm cream walls. Thoughtful premium editorial photography, real skin texture, navy clothing and subtle rust orange accents. Spacious composition, person and laptop fully readable, no added floating graphics, no logos, no text, no watermark. Optimistic human connection rather than staged stock photo handshake.

### team.webp

Use case: photorealistic-natural. Asset type: wide 3:2 website photograph. Three diverse adult colleagues, a Black man, an Asian woman and an older white woman collaborating at a small table in a warm contemporary office, one explaining an idea with a notebook, a laptop open for a remote colleague; natural candid interaction, eye-level editorial photograph, daylight, navy blue and soft orange wardrobe accents, warm wood, neutral cream background, realistic faces and hands. No signage, no logos, no readable text, no watermarks. Used to explain a team sharing advanced video meeting resources, not a physical room rental service.

### webinar.webp

Use case: photorealistic-natural. Asset type: landscape 3:2 website photograph. Confident Black woman educator presenting an online workshop from a welcoming home studio, seated with a laptop and a discreet professional microphone, speaking with engaged expressive but natural hand gesture toward the laptop camera. Soft warm daylight, bookcase and houseplant blurred in background, elegant navy sweater with rust accents. Authentic premium editorial photography, natural skin and hands, no text, no logos, no watermark. A compelling webinar host portrait.

## Validation

Frontend production build and six pricing tests pass. A local DOM check passed all seven routes, generated image references, the feature comparison, personal Pro signup navigation, organization totals, room capacity validation, and a webinar window from October 31 through November 6. The six backend tests remain green. Images were visually inspected. CSS includes narrow-screen layouts, visible focus indicators and reduced-motion handling. Browser visual/responsive QA remains unverified: managed preview could not reach the separately running SQLite API backend. No production deployment or merge is included.

The Home and Meetings pages prominently highlight screen sharing, in-meeting chat, whiteboards/annotation, polling, second-camera sharing, Pro multi-camera broadcast, and breakout rooms. Plan badges read the catalog feature matrix. Second-camera sharing is distinguished from Pro multi-camera broadcast; separate enterprise team messaging is not advertised as included in meeting plans. Iotum’s Products and Education pages informed the feature presentation. Original generated photographs remain in use; Iotum marketing imagery has not been copied.

The Webinar page now explains presentation formats, audience interaction, screen/document/whiteboard sharing, invitations/reminders, recordings/replay/AI follow-up, and device/streaming/reporting capabilities, based on https://www.iotum.com/product-whitelabel-webinar/. These are provider-platform capabilities, not confirmed package entitlements. An explicit notice keeps retail availability and usage charges pending; operator assistance is not promised, and replay remains subject to the proposed seven-day expiration and deletion policy.

## Subscriber account area

The header now includes Sign In, plus a signed-in name menu. The new account area offers My Meetings, Shared Rooms, My Account and an Organization Admin tab for authorized organization administrators. A workspace selector appears only when the member belongs to multiple workspaces. Memberships and session authorization come from the backend. Host-only users do not receive organization-admin data. Sign Out invalidates the stored session. Login uses the original website signup password; Iotum remains a separate login until SSO is implemented.

Existing provisioned test records supply the saved plan and meeting URL. Upcoming meetings and recordings stay in Iotum; the dashboard does not pretend to synchronize them. The shared-room screen shows assigned records or an empty state, with reservations explicitly pending. The first administrator view is read-only. No payment, provider role change, paid host creation or room purchase occurs from opening these pages. Future operator provisioning now uses the Iotum Host role.

Validation: 17 backend tests, six pricing tests, production build and local account DOM checks pass. Checks cover authentication, request protection, cookie attributes, expiry/logout, suspension, tenant boundaries, member/admin access, assigned-room filtering, test-record migration and Host provisioning. Account DOM checks exercise sign-in controls, provisioned meeting links, empty rooms, admin member view and non-admin navigation. Full browser visual QA remains outstanding.

Subscriber interface refinement: public-facing copy uses only Real Life Connect branding. Private account pages hide marketing navigation, the preview banner and marketing footer. Four account sections remain the main navigation; the upper account dropdown contains My Account and Sign Out. Your Personal Meeting Space is a full-size heading with two action cards: Manage Meetings → Open My Meetings, and Your Meeting Room → Open Room Link. Technical/test copy and raw plan codes have been removed; billing status remains truthful. Meeting pages still open in a separate tab and can require their own login. Reservations and administration writes remain unavailable and their availability is communicated briefly.

Open My Meetings now requests a one-time local handoff for the signed-in user and selected workspace, then opens the mapped host's meeting dashboard through the documented browser SSO GET redirect. The generic login link is no longer the primary button target. The room link remains an attendee/room link and the sign-in page's direct meeting login remains a fallback. No provider names were added to customer-facing copy. Errors close the blank tab and appear on the dashboard; blocked popups use the current tab. Build, account DOM handoff checks and backend access/expiry/replay/identity tests pass. Live browser/provider acceptance and the remembered-account switching scenario remain to be verified in Codespaces.

The initial live POST sign-on attempt returned HTTP 422 at the company endpoint. The backend now issues an empty no-store 303 redirect using the documented GET parameters, with the same access checks. The host credential appears transiently in the provider URL and must not be shared; it is not written to SQLite or application logs. Local access/expiry/replay/identity tests pass; live GET acceptance remains to be tested. No password synchronization or database migration is part of this transport change.

## Shared Pro calendar test phase

The latest owner decision supersedes earlier Plus/Pro shared-room descriptions: only Pro is shared, with up to ten assigned Basic or Plus users. Individual Basic, Plus and Pro remain available. Public room explanations and the organization calculator now offer shared Pro rooms only. The calculator prices new Basic accounts; existing Plus accounts are also eligible for assignment. Prices have not changed.

The private Shared Rooms tab now offers a seven-day local-time calendar with reservations and cancellations. Organization Admin can create a test Pro calendar, assign eligible linked Basic/Plus members and set a maximum reservation duration. Calendar selection, mobile layouts, readable navy text, loading/error states and a test-mode explanation are included. Members cannot see another member's private meeting title or cancel their reservation; organization admins can manage all bookings.

This is a SQLite reservation test, not live Pro activation or conference creation. No room subscription, payment, invitation, summary notice or hosting URL is produced. The backend enforces membership, Basic/Plus eligibility, ten assigned users, maximum duration, ownership and non-overlapping intervals. The live conference/moderator and summary-delivery integrations follow after this calendar phase is exercised. Existing personal meeting SSO remains in place.

Room-preference save correction: keep the settings form and calendar mounted by room ID while reloading saved preferences. Previously, changing their keys with the fetch revision recreated the settings form from the old assignment snapshot before the GET completed, visibly clearing newly selected users after a successful PUT. The corrected form preserves selections during and after the refresh, disables edits during a save, and clears its saved confirmation when edited. The reservation duration follows a reduced room limit without resetting the calendar. Local DOM regression checks reproduce the original failure and pass for delayed refresh, reopening and repeated saves; calendar booking/cancellation checks and the production build also pass. This is a frontend-only change; no schema update or backend restart is required. Existing Codespaces assignments must be confirmed by reloading the page.

Reservation completion flow: after a successful save, keep the current calendar range visible and replace the booking form with a confirmation containing the room, meeting title, date/time and truthful test-only status. Create another reservation opens a cleared form; Close dismisses the confirmation, leaving the calendar and a Reserve a time button. Neither action submits another booking or cancels the saved reservation. Failed saves preserve the form and its inputs. Cancelling the just-saved booking dismisses its success confirmation. Focus follows the confirmation heading or the next reservation action, and the calendar remains visible during refresh. Local DOM checks cover success, both next actions, repeated-save avoidance, failure recovery, cancellation and the prior assignment-save regression; the production build passes. No backend or schema change is required.


## Shared-room task navigation

Shared Rooms now opens a room list, not an expanded calendar/settings/form stack. Each Pro card offers View calendar; authorized organization administrators also get Add shared room and Room preferences. The Shared Rooms dashboard passes the already verified local administrator capability for those controls, while backend authorization remains unchanged. Organization Admin uses the same room-task UI.

The calendar is a distinct view with local Back to shared rooms controls above and below it, plus a sticky task toolbar. Booking starts only after Create reservation. A native modal dialog contains the form, then the saved confirmation. Close returns to the same calendar week; Create another reservation starts a fresh form. Cancel, the close icon and Escape dismiss the task without submitting or cancelling a saved booking. Editing and dismissal are disabled while a write is pending. Native dialog modality, labelled headings, focus restoration and background scroll locking keep the task self-contained.

Adding a test room and editing preferences are separate dialogs with explicit completion and exit actions. Saved assignments survive refreshing and reopening. The list also provides Exit shared rooms — My Meetings. No backend, pricing, schema, activation or live conference behavior changes. All creation remains clearly identified as local test calendars/reservations.

Validation: local DOM interaction checks pass for list-first navigation, calendar viewing, modal save/close/another/cancel/Escape, failed saves, assignment persistence, add-room completion and member/admin controls. Browser QA with local sample data confirms the real dialog renders, a saved reservation appears on the calendar, Close returns to that calendar and Back returns to the room list. The production build passes. Live Codespaces data remains for user verification after pulling.

## Separate signed-in application layout

Authenticated account routes now render a dedicated full-height application shell, outside the public marketing header, page-width wrapper and footer. The floating white left sidebar contains My Meetings, Shared Rooms and My Account. Organization administrators additionally receive Organization Admin, with Members and Shared room settings subsections. Selecting a section replaces the main workspace and resets only its content scroll position. The sidebar, section title and account menu remain accessible while long tables or calendars scroll. Public website returns to the marketing experience without changing the session.

Organization member lookup and shared-room management are separate admin views rather than stacked sections. Existing room-list/calendar/task dialogs and host-specific SSO remain in use. Navigation permissions derive from the selected workspace; direct admin hashes for members fall back to My Meetings without fetching admin data. Backend authorization and the separate customer/reseller role model are unchanged. Reseller-only pricing, companies, billing and support screens are not exposed as organization-admin functions.

On narrow screens, a menu button opens a native modal navigation drawer with Close and Escape actions. Workspace selection remains available for accounts with multiple memberships. All new text uses the requested navy palette, with the official logo on white.

Validation: local DOM checks pass for sidebar routing, active sections, content scroll reset, separate admin tasks, mobile drawer controls, member/admin boundaries and the existing SSO action. Room task flow checks still pass. Browser QA with sample data confirms fixed navigation during workspace scrolling, section changes, returning to the public product site and re-entering the application. Pricing tests and the production build pass. This is frontend-only: no database migration, backend restart or live provider change is required. Uploaded admin screenshots were used as layout references only; their customer records were not imported.
