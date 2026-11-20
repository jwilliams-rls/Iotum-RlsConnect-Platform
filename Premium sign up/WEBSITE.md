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

## Shared room table and task dialogs

Shared Rooms uses a labeled table with room name, plan and maximum reservation duration. Administrators also see Users (people icon only), Calendar and Preferences (pencil icon). The people action opens a focused user-assignment dialog showing the assigned count out of ten. Use Add existing user to select an unassigned linked Basic or Plus member of the same organization, or Remove beside an assigned member. Save room users commits these changes; Cancel discards them. Duplicate assignments and additions beyond ten are prevented; the pencil edits the room name and duration while preserving assignments. Member views retain calendar access without administrator actions.

Add shared room is positioned above the table on the left. Its popup has Submit and Cancel. A successful submission closes the popup, refreshes the canonical room list and displays confirmation; failed submissions preserve the form and allow retry. Creation remains a local Pro test calendar and does not purchase or activate a subscription.

Validation: production build; DOM flow checks for assignment persistence, separate user/preferences dialogs, member boundaries, room creation success/failure/cancel, calendar navigation and reservation completion; browser review of the table and popup using sample data.

## Host and organization navigation

The sidebar keeps two expanded groups: Host Admin (My Meetings, Shared Rooms, My Account), and Organization Admin for authorized administrators (Members, Shared room settings). All links are indented and visible without opening a parent section.

Host Admin → Shared Rooms shows only rooms assigned to the current eligible host, including when that host is also an organization administrator. It presents calendars and reservation tasks, without room creation, user assignment or preference controls. Other users’ reservations display as Reserved and cannot be cancelled from the host view. Organization Admin → Shared room settings retains the room-management actions. Live shared-room meeting launch remains unconnected.

## Per-user shared-room feature approvals

Under Organization Admin → Shared room settings → Users, every assigned user has separate Allow live streaming and Allow YouTube streaming checkboxes. Both default to off independently of the user’s personal plan. Save room users persists approvals together with the room assignments; Cancel discards edits. Removing and re-adding a user resets approvals. Preferences preserve the existing values. Host Admin has no approval-editing controls. Backend schema 10 and a restart are required.

These controls store local policy for shared rooms. Live streaming and provider-side enforcement remain unconnected; saving approvals does not activate broadcasting or change personal subscription features.

## Deferred: meeting agendas and agenda-guided analysis

Requested November 8, 2026. Revisit after the Host Admin Shared Rooms workflow. This is a future exploration, not an implemented meeting feature.

- Allow agendas and other review documents to be attached while scheduling a meeting.
- Provide a structured agenda editor, with a dedicated Agenda menu selection where participants can read the agenda directly in the application rather than opening a document.
- Use agenda topics as a meeting guide and explore relating transcript content, responses, summaries, covered/uncovered topics and follow-up items to those topics.
- Investigate whether Cue supports agenda-guided analysis through available APIs; otherwise assess a separate application integration. Do not assume existing provider support.

Keep this out of the immediate upcoming shared-room meetings table implementation. Participant access, editing permissions and document storage remain to be designed.

## Host shared-room upcoming meetings

Host Admin → Shared Rooms now opens My upcoming room meetings, a table containing only the signed-in host’s unended, uncancelled reservations in assigned, nonsuspended Pro rooms. Meetings are ordered by start time across all assigned rooms, with current room-specific YouTube/live-streaming approvals shown as permissions, not as active broadcast indicators. A reserved time already underway is labeled Reserved time in progress, not Live. Organization administrators using this host screen also see only their own reservations.

Reserve a room opens the assigned-room table and calendars. A meeting-row Calendar action opens that reservation’s date. After saving, Close returns to the upcoming list; Create another reservation stays in the calendar workflow. Local screen transitions reset the workspace scroll position while retaining the sidebar. View details opens a task dialog. Cancel asks for confirmation, Keep reservation makes no changes, and failed cancellation leaves the reservation and dialog available for retry. Successful cancellation refreshes the list.

Start meeting, Add documents and Add participants are visibly unavailable in meeting details until their integrations are implemented. Recurrence and agenda editing remain future work. All bookings are local test reservations.

Backend route GET /api/workspaces/:id/room-meetings requires an authenticated workspace membership and returns only the requesting eligible Basic/Plus host’s own reservations, with current approvals. It spans future dates rather than just the visible calendar week. This update requires a backend restart, with no database schema change. Validation: all 28 backend tests, room-flow and workspace DOM checks, production build, and browser review with sample meetings.

## Host-controlled meeting settings

Scheduling now includes Meeting participation mode (Conversation, Q&A, Presentation) with contextual explanations and Require a meeting PIN. PIN fields are masked and accept 4–12 digits. New reservations default to Conversation without a PIN. Create another reservation resets these choices. Test-mode copy explicitly states that these settings are not yet applied to live conferences.

The upcoming-meetings table has an Edit meeting action for the host’s own future reservations. The dialog loads current settings, allows title/mode/PIN changes and saves with a revision check. Cancel discards edits. Existing PINs are not revealed; leave the replacement blank to keep the current PIN or uncheck the requirement to clear it. Details show the selected mode and whether a PIN is required, never the PIN itself. Room and time cannot be changed by this form. Streaming approvals remain exclusively under Organization Admin, and participant invitations, rescheduling, agendas and live conference synchronization are separate work. Backend schema 11 and a restart are required.

## Upcoming meeting table alignment

The host upcoming table has explicit row and column grid lines, a shaded header and alternating row backgrounds. All cells, including the meeting-name row header, align at the top so each reservation reads across one row. Details, Edit, Calendar and Cancel are compact horizontal buttons with descriptive accessible names. Fixed column proportions and horizontal overflow preserve alignment on narrower screens. Verified visually with sample meetings and a successful production build. Frontend only; no backend restart is needed for this adjustment.

Meeting-row actions now use navy SVG icons: eye (details), pencil (edit), calendar (view calendar), and calendar with an X (cancel reservation). Each 40px button retains its descriptive accessible name and a hover title. The cancellation confirmation remains unchanged. Narrower action-column proportions give more space to meeting details. Verified with room-flow checks, production build and a browser preview. Frontend-only update.

## Application list and action standard

All signed-in application data tables now share application-ui.css through app-data-table: visible column/row borders, shaded headers, alternating rows, navy text and top-aligned cells. This is applied to upcoming meetings, room selection/administration and organization Members. Tables retain horizontal overflow on small screens. Name cells are row headers and column headings identify each field.

Use RowAction from ApplicationUI.jsx for compact row actions, with a familiar ActionIcon, descriptive accessible label, hover title and visible keyboard focus. Existing meeting/room icons now share that component. Keep task-level Save, Cancel, Add and navigation buttons labeled with text. Do not add nonfunctional row actions just for appearance. New signed-in list screens should use these same styles and components. Public marketing plan comparisons keep their separate presentation.

Verified with the room-flow and workspace navigation checks, production build, and browser review of organization room and member tables using sample data. Frontend-only; no backend restart required.

Calendar headers now show “[Room name] Calendar” first. Upcoming meetings and Back to shared rooms navigation buttons appear beneath the title, with calendar task actions alongside them when space allows. The row wraps on narrower screens. Room-flow checks, production build and browser layout review passed. Frontend-only update.

## Month-first room calendar

Calendar icons now open the room’s monthly overview, with Sunday–Saturday columns, a current-date marker and reservation counts for each date. Previous/next month, a native month picker and Today support navigation. Inactive adjacent-month dates provide week alignment. A failed load displays Unavailable and disables day selection; Retry calendar reloads.

Selecting a date opens a separate daily schedule table with times, meeting titles, optional descriptions and permitted cancellation icons. Back to month returns to the selected month/date, while Upcoming meetings and Back to shared rooms remain beneath the room Calendar heading. Internal screen transitions reset workspace scrolling and restore keyboard focus. Daily cancellation asks for confirmation. Create reservation on a future/current selected date prefills the date; past dates can be reviewed but not booked.

Hosts can enter an optional brief description when scheduling or editing. Descriptions use plain text (up to 2,000 characters), not agenda documents. Host views reveal only the host’s own titles/descriptions; other bookings appear as Reserved/Private meeting. Organization administrators can review details within their administration view. Counts include all visible reservations occupying that date and do not imply completed or live meetings.

This update needs backend schema 12 and a restart. It preserves existing reservations and host settings, and remains in local test mode. Reuse calendar-dates.js for local month/day boundaries. Calendar-date tests cover leap years, six-row months, year rollover, midnight boundaries and daylight-saving changes.
