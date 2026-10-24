const exercises = [
  { n: 1, slug: '01-fix-the-form', title: 'Fix the Form', difficulty: 'Easy', track: 'Foundations', concepts: 'HTML semantics, labels, input types, accessibility' },
  { n: 2, slug: '02-style-the-profile-card', title: 'Style the Profile Card', difficulty: 'Easy', track: 'Foundations', concepts: 'CSS selectors, box model, typography' },
  { n: 3, slug: '03-click-counter', title: 'Click Counter', difficulty: 'Easy', track: 'Foundations', concepts: 'DOM selection, events, textContent' },
  { n: 4, slug: '04-center-it', title: 'Center It', difficulty: 'Easy', track: 'Foundations', concepts: 'Flexbox, CSS Grid, absolute positioning' },
  { n: 5, slug: '05-ecommerce-search-box', title: 'E-commerce Search Box', difficulty: 'Easy', track: 'Interactive DOM', concepts: 'input events, filtering, dynamic rendering (real question)' },
  { n: 6, slug: '06-todo-list', title: 'To-Do List', difficulty: 'Easy-Medium', track: 'Interactive DOM', concepts: 'createElement, classList, remove, empty state' },
  { n: 7, slug: '07-form-validation', title: 'Form Validation', difficulty: 'Medium', track: 'Interactive DOM', concepts: 'regex, preventDefault, inline errors' },
  { n: 8, slug: '08-show-hide-password', title: 'Show / Hide Password', difficulty: 'Easy', track: 'Interactive DOM', concepts: 'attribute toggling, input type' },
  { n: 9, slug: '09-dark-mode-toggle', title: 'Dark-Mode Toggle', difficulty: 'Medium', track: 'Interactive DOM', concepts: 'CSS variables, classList, theming' },
  { n: 10, slug: '10-responsive-navbar', title: 'Responsive Navbar', difficulty: 'Medium', track: 'CSS Layout', concepts: 'media queries, flexbox, hamburger toggle' },
  { n: 11, slug: '11-responsive-card-grid', title: 'Responsive Card Grid', difficulty: 'Medium', track: 'CSS Layout', concepts: 'CSS Grid auto-fill/minmax, hover transitions' },
  { n: 12, slug: '12-progress-bar', title: 'Progress Bar + Spinner', difficulty: 'Medium', track: 'CSS Layout', concepts: '@keyframes, transitions, JS-triggered animation' },
  { n: 13, slug: '13-accordion', title: 'Accordion', difficulty: 'Medium', track: 'JS Logic & Data', concepts: 'DOM traversal, single-open state' },
  { n: 14, slug: '14-tab-switcher', title: 'Tab Switcher', difficulty: 'Medium', track: 'JS Logic & Data', concepts: 'data-* attributes, active state' },
  { n: 15, slug: '15-dynamic-table', title: 'Dynamic Table', difficulty: 'Medium-Hard', track: 'JS Logic & Data', concepts: 'map / filter / sort, rendering, templating' },
  { n: 16, slug: '16-image-carousel', title: 'Image Carousel', difficulty: 'Medium', track: 'JS Logic & Data', concepts: 'index state, wrap-around, dots + arrows' },
  { n: 17, slug: '17-live-clock', title: 'Live Digital Clock', difficulty: 'Easy-Medium', track: 'Advanced', concepts: 'Date, setInterval, zero-padding (real question)' },
  { n: 18, slug: '18-fetch-and-render', title: 'Fetch & Render', difficulty: 'Medium', track: 'Advanced', concepts: 'fetch, async/await, loading & error states' },
  { n: 19, slug: '19-persistent-todo', title: 'Persistent Notes', difficulty: 'Medium-Hard', track: 'Advanced', concepts: 'localStorage, JSON, state persistence' },
  { n: 20, slug: '20-quiz', title: 'Quiz', difficulty: 'Medium-Hard', track: 'Advanced', concepts: 'state management, conditional rendering, scoring' },
];

const grid = document.getElementById('grid');
const filters = document.getElementById('filters');

const tracks = ['All', ...Array.from(new Set(exercises.map((e) => e.track)))];
let activeTrack = 'All';

function difficultyClass(difficulty) {
  return difficulty.toLowerCase().replace(/[^a-z]/g, '');
}

function render() {
  filters.innerHTML = '';
  tracks.forEach((track) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter' + (track === activeTrack ? ' active' : '');
    btn.textContent = track;
    btn.addEventListener('click', () => {
      activeTrack = track;
      render();
    });
    filters.appendChild(btn);
  });

  grid.innerHTML = '';
  exercises
    .filter((e) => activeTrack === 'All' || e.track === activeTrack)
    .forEach((e) => {
      const card = document.createElement('article');
      card.className = 'exercise';
      card.innerHTML = `
        <div class="exercise-top">
          <span class="num">${String(e.n).padStart(2, '0')}</span>
          <span class="badge ${difficultyClass(e.difficulty)}">${e.difficulty}</span>
        </div>
        <h2>${e.title}</h2>
        <p class="track">${e.track}</p>
        <p class="concepts">${e.concepts}</p>
        <div class="links">
          <a href="ide.html?exercise=${e.slug}">Start coding</a>
          <a href="exercises/${e.slug}/solution/index.html" class="ghost">Solution</a>
        </div>
      `;
      grid.appendChild(card);
    });
}

if (grid && filters) render();
