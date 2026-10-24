# Accenture Frontend Machine-Coding Practice

20 vanilla **HTML / CSS / JavaScript** exercises modelled on the **Accenture UI
coding round**. Each exercise mirrors how the real task is delivered: you are
given pre-built files and asked to modify them, not write from a blank canvas.

> Real candidate report of the round: *"Task 1: Modify the HTML file. Task 2:
> Make changes in the CSS file. Task 3: Update logic in the JavaScript file."*
> Skill areas: DOM manipulation, click & event handling, dynamic elements,
> JavaScript logic, interactive UI components.

---

## Run the project on Windows

You need Node.js and npm installed. Open PowerShell or the VS Code terminal.

### One-time setup

Run these commands from the project folder (also repeat them after a fresh clone):

```powershell
npm install
npx playwright install chromium
```

Chromium is needed for the automated test cases. It does not replace your normal browser.

### Start the website

Each time you want to practise:

```powershell
cd E:\Projects\accenture-frontend-practice
npm run dashboard
```

Keep this terminal open. Visit **http://localhost:4173/** in your browser.

1. Click **Start coding** on an exercise.
2. Read its problem statement and edit the **HTML**, **CSS**, and **JavaScript** tabs.
3. Click **Preview** to see your current code.
4. Click **Run Code** (or press **Ctrl+Enter**) to run the exercise's test cases.
5. Check the passed/total score and expand failed cases to read the feedback.

Drafts save automatically in the same browser. Use the same address and browser
when returning to your work. Browser drafts do not overwrite the exercise files
on disk. **Reset draft** restores the starter code after confirmation.

### Stop the website

In the terminal running the server, press **Ctrl+C**. If Windows asks
`Terminate batch job (Y/N)?`, type **Y** and press Enter. Then close the website tab.
Closing only the browser tab does not stop the server. Your saved drafts remain
available unless you clear the browser's site data.

### Troubleshooting

- **npm is not recognised:** install Node.js with npm, then reopen your terminal.
- **PowerShell blocks npm.ps1:** use `npm.cmd` instead of `npm` and `npx.cmd` instead of `npx` in these commands.
- **Browser cannot connect:** make sure `npm run dashboard` is still running and use http://localhost:4173/.
- **Chromium executable is missing:** run `npx playwright install chromium` from the project folder and retry Run Code.
- **Port 4173 is already in use:** stop the earlier server with Ctrl+C in its terminal before starting another one.

No build step or frontend framework is needed. Opening `index.html` directly
will not run the IDE's preview and grading APIs; start the server as shown above.

## Optional command-line checks

These commands grade files **on disk**, not drafts saved in the browser:

```powershell
# Grade one exercise
npm test -- exercises/05-ecommerce-search-box

# Grade every exercise (unfinished starter files are expected to fail)
npm test

# Check the browser IDE itself
npm run test:ide

# Grade reference solutions in PowerShell
$env:SOLUTION = '1'
npm test -- exercises/05-ecommerce-search-box
# Or use npm test to check every reference solution
Remove-Item Env:SOLUTION
```

---

## How an exercise works

```
exercises/05-ecommerce-search-box/
├── task.md          # the brief, written like the real assessment prompt
├── index.html       # pre-built, with <!-- TODO --> gaps
├── style.css        # pre-built, with /* TODO */ gaps
├── script.js        # pre-built skeleton, with // TODO gaps
├── test.spec.js     # automated grader for this exercise
└── solution/        # complete reference implementation
```

1. Read `task.md`.
2. Fill in the `TODO`s in `index.html`, `style.css`, `script.js`.
3. Run `npm test -- exercises/<folder>` to check your work.
4. Stuck? Compare against `solution/` or open it in the browser.

`npm test` loads **your** files; `npm run test:solutions` loads the `solution/`
folders. A passing test suite means the required behaviour works.

---

## The 20 exercises

| # | Exercise | Difficulty | Focus |
|---|----------|------------|-------|
| 01 | Fix the Form | Easy | HTML semantics & accessibility |
| 02 | Style the Profile Card | Easy | CSS selectors, box model, typography |
| 03 | Click Counter | Easy | DOM selection, events, `textContent` |
| 04 | Center It | Easy | Flexbox, Grid, absolute positioning |
| 05 | **E-commerce Search Box** | Easy | input events, filtering (real question) |
| 06 | To-Do List | Easy-Medium | `createElement`, `classList`, `remove` |
| 07 | Form Validation | Medium | regex, `preventDefault`, inline errors |
| 08 | Show / Hide Password | Easy | attribute toggling, input type |
| 09 | Dark-Mode Toggle | Medium | CSS variables, `classList` |
| 10 | Responsive Navbar | Medium | media queries, flexbox |
| 11 | Responsive Card Grid | Medium | CSS Grid, hover transitions |
| 12 | Progress Bar + Spinner | Medium | `@keyframes`, transitions |
| 13 | Accordion | Medium | DOM traversal, single-open state |
| 14 | Tab Switcher | Medium | `data-*` attributes, active state |
| 15 | Dynamic Table | Medium-Hard | `map` / `filter` / `sort`, rendering |
| 16 | Image Carousel | Medium | index state, wrap-around, dots |
| 17 | **Live Digital Clock** | Easy-Medium | `Date`, `setInterval` (real question) |
| 18 | Fetch & Render | Medium | `fetch`, `async/await`, error states |
| 19 | Persistent Notes | Medium-Hard | `localStorage`, JSON |
| 20 | Quiz | Medium-Hard | state, conditional rendering, scoring |

Exercises **05** and **17** are based on questions reported from the actual
Accenture frontend round.

---

## What the real round tests

From the research (PrepInsta, GeeksforGeeks candidate reports, LinkedIn
coach/candidate posts):

- The frontend task is **easy difficulty**; the backend/DSA task is the hard one.
- The coding round is **~60 minutes, 3 tasks** (SQL + backend + frontend) in the
  current pattern; no negative marking; partial test-case scoring.
- The frontend task = **modify existing HTML/CSS/JS** to implement a feature.
- Core skills: **DOM manipulation, event handling, dynamic rendering, and
  understanding + modifying an existing HTML/CSS structure with JavaScript.**

This repo drills exactly those skills, one concept at a time.

---

## Project structure

```
.
├── index.html            # dashboard listing all exercises
├── dashboard.css / .js
├── server.js             # tiny static server (no deps)
├── playwright.config.js  # test runner config
├── package.json
└── exercises/
    ├── 01-fix-the-form/
    ├── ...
    └── 20-quiz/
```

---

## Adding your own exercise

1. Copy any exercise folder.
2. Rename it and update `task.md`.
3. Keep the `test.spec.js` pattern (it reads `__dirname` and honours
   `SOLUTION=1` to target the `solution/` folder).
4. Add it to the `exercises` array in `dashboard.js`.

## Browser coding workspace

Start `npm run dashboard`, open http://localhost:4173, and choose **Start coding**.
The workspace includes the task brief, HTML/CSS/JavaScript file tabs, an isolated
preview, and **Run Code** (Ctrl+Enter). Run Code executes the selected exercise's
existing `test.spec.js` with Playwright and displays each result and failure details.
Install Chromium once using `npx playwright install chromium` before grading.

Drafts are saved per exercise in this browser's local storage. They do not change
the original exercise files. **Reset draft** restores those starter files after
confirmation. Command-line tests still grade files on disk, not browser drafts.
Preview is refreshed with **Preview** or **Run Code**; it is a snapshot, not live
on every keystroke. Preview refresh starts a fresh origin and storage session.

The local server accepts one grading run at a time, with a 150-second test-suite
limit. It listens on loopback only and is intended for personal practice, not a
public multi-user judge. This is an independent practice tool, not an official
Accenture assessment platform.

### Editor shortcuts

- **Tab:** insert two spaces at the cursor, or indent every selected line.
- **Shift+Tab:** remove one indentation level from the current or selected lines.
- **Ctrl+Z / Cmd+Z:** undo the last edit in the active file.
- **Ctrl+Y / Ctrl+Shift+Z / Cmd+Shift+Z:** redo.
- **Escape, then Tab:** move keyboard focus out of the editor.

Undo history is separate for each file and survives switching editor tabs. It
keeps up to 200 edits during the current page session; reloading or resetting the
draft clears the history. Saved draft contents still survive a reload.

### Moving between questions and viewing solutions

Use **Next question →** in the workspace header to open the next exercise. The
button is disabled on the last question. Your drafts remain saved per exercise.
Select **Solution** beside **Problem** to read the reference HTML, CSS, and
JavaScript. This view does not replace your draft; Preview and Run Code continue
to use your own editor contents. Select **Problem** to return to the task brief.

### Code suggestions

The editor offers built-in HTML tags and attributes, CSS properties, and common
JavaScript/DOM names as you type. Suggestions appear beside the text cursor and
insert only the selected name, without arguments, punctuation, or full snippets. Press **Ctrl+Space** (or **Cmd+Space**) or
click **Suggest** to open the list manually. Use **Up/Down** to choose,
**Enter/Tab** to insert, or **Escape** to dismiss. You can also click a suggestion.
Selected lines still use Tab for indentation. Inserted suggestions support undo
and redo and save with your draft. These are local prefix-based suggestions,
not AI-generated answers or full language-server autocomplete.

CSS suggestions also recognize the property before the colon: colors for
`color`/`background-color`, layout values for `display` and `position`, border
styles, font settings, and more. Typing a numeric prefix such as `12p` suggests
`12px`; time properties support `s` and `ms`. Suggestions insert only the
selected name or value and remain beside the cursor.

### Syntax colors and new lines

HTML tags, CSS properties, JavaScript keywords, strings, comments, and numbers
are highlighted in different colors. Enter continues the current line’s leading
spaces or tabs on the new line. Undo/redo includes the newline and indentation
as one edit. When suggestions are open, Enter accepts the selected suggestion;
press Escape first to dismiss them and insert a new line.

### Responsive preview and block indentation

Use the preview’s Device menu to switch between Mobile (390px), Tablet (768px),
and Desktop (1280px), or enter a custom width from 320 to 1920px. These controls
change the page’s actual viewport so media queries respond. Large previews scale
to fit the panel; the size and scale are shown above them. **Expand preview** gives
you more room; press Escape or the close button to return. Resizing keeps the
preview’s current state. Click Preview after editing to load your latest code.

Enter after an opening brace adds one indentation level (two spaces, or a tab
when the current indentation uses tabs). With the cursor between `{}`, Enter
places the closing brace on its own line and leaves the cursor indented inside.
