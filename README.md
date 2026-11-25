# 🏡 Family Hub

A free family command center for any **iPad, Android tablet, or old computer**. It does what $250–$600 smart family calendars (Nori, Skylight, Hearth) do, with no hardware to buy, no subscription and no server to run.

**Open it:** https://karthikvepuriphoto-gif.github.io/family-hub/

## What it does

| | Nori / Skylight-style hubs | Family Hub |
|---|---|---|
| Color-coded family calendar | ✅ | ✅ Day (a column per person), Week, Month and List views, repeating events, swipe to change weeks |
| Google / iCloud / Outlook sync | ✅ | ✅ Subscribes to any calendar's iCal (.ics) address, read-only, refreshed every 30 min. You can also import .ics files |
| Chore chart with routines | ✅ | ✅ Morning, after-school, evening and anytime routines on chosen weekdays, with big tap targets for kids |
| Rewards | ✅ | ✅ Stars per chore, a reward shop, bonus stars and history |
| Meal planning + grocery list | ✅ | ✅ Weekly meal grid, a family recipe box, and a button that puts the week's ingredients on the list |
| Recipe suggestions | 💲 AI add-on | ✅ **Free**: daily recipe ideas on the home screen, "what can I make with chicken?", a "surprise me" button, and reminders of family favorites you haven't cooked lately |
| To-do and shopping lists | ✅ | ✅ Any number of lists, people can be assigned, add several items at once with commas |
| Weather | ✅ | ✅ Current conditions and a 5-day forecast (Open-Meteo, no key needed) |
| Photo frame / screensaver | ✅ | ✅ Slideshow when idle, showing the clock and the next event |
| Parent controls | — | ✅ A PIN for settings, editing chores and approving rewards |
| Natural-language add | 💲 AI | ✅ Type “Soccer Tue 5–6pm @Kiddo every week” |
| Double-booking warnings | — | ✅ Flags when one person has two overlapping events |
| Night mode | — | ✅ Dims the screen automatically on a schedule. Dark theme included |
| Works offline | — | ✅ Installable app (PWA) that keeps working when Wi-Fi drops |
| Privacy | Cloud account | Everything stays on your device. No account and no tracking |

## Set it up on a wall tablet or computer

1. Open the link above in **Safari (iPad)**, **Chrome (Android)** or any browser on your computer.
2. **iPad:** tap Share → **Add to Home Screen**. **Android:** tap ⋮ → **Install app**. This gives you full screen with no browser bars.
3. In **Settings**, add your family members, your town (for weather), and photos. Set a parent PIN.
4. Keep the screen on:
   - **iPad:** Settings → Display & Brightness → Auto-Lock → Never. Use Guided Access to lock it to the app.
   - **Android:** "Keep screen awake" in the app (Chrome supports it), or Developer options → Stay awake while charging.
   - **iMac / Mac:** open it in Chrome or Safari and press ⌃⌘F for full screen. Set System Settings → Lock Screen → "Turn display off" to Never, and stop the Mac from sleeping.

## Connect Google / iCloud calendars

- **Google Calendar** (on a computer): Settings → pick the calendar → *Integrate calendar* → copy the **Secret address in iCal format**.
- **iCloud:** Calendar app → share the calendar → turn on **Public Calendar** → copy the `webcal://` link.
- **Outlook:** Settings → Calendar → Shared calendars → *Publish a calendar* → copy the ICS link.

Paste the link in **Settings → Calendars**. Some providers block browsers from reading feeds directly. If a feed won't load, add a CORS proxy (for example a free Cloudflare Worker you own) in the same section, or download the `.ics` file and import it.

## Data & backups

Data is saved in the browser on each device: localStorage, plus IndexedDB for photos. Use **Settings → Backup** to download a file and restore it on another device.

## Tech

Plain HTML, CSS and JavaScript modules. There is no build step and nothing to install. Host it on GitHub Pages or run `python3 -m http.server` in this folder.

```
index.html          app shell
css/app.css         styles (tablet-first, scales to 4K)
js/app.js           navigation, clock, wake lock, feeds, screensaver
js/store.js         data model, repeating events, chores & stars
js/services.js      weather (Open-Meteo), recipes (TheMealDB), feed fetching
js/ics.js           iCalendar parser
js/quickadd.js      natural-language event parser
js/editors.js       event / meal / recipe editors
js/views/*.js       Home, Calendar, Chores, Meals, Lists, Rewards, Settings
sw.js               offline cache
```

## Roadmap

- [ ] Live sync between devices: a phone and the wall tablet sharing one family (likely Firebase or Supabase, free tier)
- [ ] Two-way Google Calendar (add events from the hub into Google)
- [ ] Reminders and notifications on phones
- [ ] Optional AI assistant: turn a school flyer photo or an email into events, and plan meals from what's in the fridge
- [ ] Countdown widgets (birthdays, trips) and a family message board
- [ ] Drag-and-drop to rearrange the home screen

## Credits

Weather from [Open-Meteo](https://open-meteo.com) and recipe ideas from [TheMealDB](https://www.themealdb.com), both free. Inspired by open-source projects like Beacon, Kinboard and SkyLite-UX, which need a home server. Family Hub was built to run on any device with nothing installed.

MIT License.
