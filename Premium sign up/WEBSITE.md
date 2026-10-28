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
