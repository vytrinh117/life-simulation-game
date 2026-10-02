# QC Report — Life Simulator v7

## Result
**PASS for the implemented v7 scope.**

## Static checks
- `node --check game.js`: PASS
- `node --check data.js`: PASS
- Duplicate HTML IDs: none found
- Missing static DOM references: none, excluding intentionally dynamic stand/yard-sale form fields
- Duplicate function declarations: none
- Absolute `/assets/...` style paths: none
- GitHub Pages workflow present
- `.nojekyll` present
- ZIP/static structure verified at repository root
- Visible panel buttons audited for a routing ID/data-action: no unhandled clickable-looking panel buttons found in tested age states

## Browser runtime QC
The environment blocks Chromium navigation to localhost with `ERR_BLOCKED_BY_ADMINISTRATOR`. To still perform browser-level runtime testing, QC injected the **exact generated HTML, CSS, data.js and game.js** into a Chromium blank page and exercised the real DOM/event handlers. This catches JavaScript exceptions, broken selectors, UI state failures and layout overflow. LocalStorage was replaced only in the test harness with an in-memory implementation because opaque blank-page origins cannot use browser storage.

Observed uncaught page/console errors during the full injected-browser suite: **0**.

### Start / state lifecycle
- Begin Life opens game: PASS
- Initial needs initialize/render: PASS
- Manual save: PASS
- Load into a fresh browser page: PASS
- Restart confirmation and return to creator: PASS
- Restart preserves unrelated browser-storage key: PASS
- Representative v6.3 autosave migration → v7: PASS
- Legacy contest timing → v7 date fields: PASS

### Age-stage checks
Test characters at ages **1, 3, 6, 10, 13, 16, 18, 25, 40 and 70**.
- All visible navigation panels rendered non-empty: PASS
- Age 3 no independent phone: PASS
- Age 3 travel presented as caregiver/family context: PASS
- Age 10 Money & Items available: PASS
- Age 13 Phone tab hidden: PASS
- Age 16 Phone tab visible but ownership still required: PASS
- Age 70 Work & Retirement state visible: PASS

### Needs / daily actions
Forced Hunger, Toilet, Hygiene and Sleep to severe states at age 3.
- Each need remained actionable: PASS
- Each recovery action advanced simulation time: PASS
- Age-appropriate labels/methods: PASS
- Eat, Drink, Toilet, Wash/Bath, Brush Teeth, Dress, Sleep, Nap and Rest visible in Daily Life: PASS

### School
- Club exploration produces a single offer: PASS
- Under-13 club join creates delayed caregiver decision: PASS
- Favorable caregiver decision activates club: PASS
- Active club contains real actions and changes sessions/skill: PASS
- School-event exploration creates event with registration deadline + event date: PASS
- Exam schedule/countdown exists: PASS
- Advance to exam date exposes Take Exam: PASS
- Exam action resolves to a score: PASS

### Money / requests / phone
- Child parent-managed savings counted toward a purchase with permission: PASS
- Age 12 can own a purchased phone but cannot independently use Phone system: PASS
- Same owned phone becomes usable at configured high-school phone age: PASS
- Controlled caregiver request entered `Considering`: PASS
- Advancing to decision date resolves or converts it to a clear condition: PASS
- Birthday gift request remains unresolved before birthday: PASS
- Birthday request resolves on the birthday: PASS
- Christmas request remained unresolved Dec 24 and resolved Dec 25: PASS
- Christmas gift trigger did not repeat on Dec 26: PASS

### Small business / inventory
- Age 6 small stand can initialize with favorable caregiver approval: PASS
- One session did not create runaway thousands of dollars in revenue: PASS
- Adult item purchase enters structured inventory: PASS
- Inventory exposes real item actions: PASS
- Use/Wear/Gift/Sell/Repair/Store/Discard paths are wired to logic

### Age Up
- Advances exactly one birthday in tested state: PASS
- Scheduled/holiday logic processes during skip: PASS
- Does not generate hundreds of routine daily log entries: PASS

### Responsive layout
No document-level horizontal overflow detected at:
- 1920×1080: PASS
- 1440×900: PASS
- 1366×768: PASS
- 768×1024: PASS
- 390×844: PASS

## Known limitations / intentionally simplified areas
- Lunar New Year currently uses a simplified in-game February period rather than an astronomical lunar-calendar library.
- Real-world country-specific laws, school calendars, transport systems, currencies and prices are not a complete geographic/legal database.
- University/trade-school, housing, marriage/children, inheritance/legal disputes, full company management and celebrity-industry careers are not yet as deep as the core needs/family/school/money systems.
- Vehicle fuel, insurance and maintenance are abstracted.
- Browser QC could not navigate the local HTTP URL due to environment policy; static path/workflow checks were done separately and exact assets were runtime-tested by injection.
