import { initInterface, genEdAreaMeta, uniqueAccordionId, setFilters, collectFilters } from './interface.js';

const pageSize = 10;
let allCourses = [];
let filteredCourses = [];
let currentPage = 1;
let currentFilters = null;
let pendingFilters = null;
let coursesPromise = null;
let lastFocusedId = null;

// SVG markup for pagination icons from Rivet Icons
const icons = {
  first: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M.586 8 7 14.414 8.414 13l-5-5 5-5L7 1.586.586 8Z"/>
    <path d="M6.586 8 13 14.414 14.414 13l-5-5 5-5L13 1.586 6.586 8Z"/>
  </svg>`,
  prev: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M9.737.854 3.69 8l6.047 7.146 1.526-1.292L6.31 8l4.953-5.854L9.737.854Z"/>
  </svg>`,
  next: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M6.263 15.146 12.31 8 6.263.854 4.737 2.146 9.69 8l-4.953 5.854 1.526 1.292Z"/>
  </svg>`,
  last: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M9.414 8 3 1.586 1.586 3l5 5-5 5L3 14.414 9.414 8Z"/>
    <path d="M15.414 8 9 1.586 7.586 3l5 5-5 5L9 14.414 15.414 8Z"/>
  </svg>`
};

function getAllCourses() {
  if (!coursesPromise) {
    coursesPromise = fetch('gened-data/explore-gened.json').then(r => r.json());
  }
  return coursesPromise;
}

async function loadCourses() {

  const container = document.querySelector('#course-list');
  try {
    // Attempt to load the list of courses from the static JSON file.
    allCourses = await fetch('gened-data/explore-gened.json').then(r => r.json());
  } catch (err) {
    // Display a placeholder message if the course data cannot be retrieved.
    if (container) {
      container.innerHTML = '<p class="rvt-alert rvt-alert--danger">Unable to load course data.</p>';
    }
    console.error('Failed to load courses', err);
    return;
  }
  if (pendingFilters) {
    applyFilters(pendingFilters);
    pendingFilters = null;
  } else {
    filteredCourses = allCourses;
    render();
  }
}

/**
 * Render a Rivet accordion containing course information.
 * Each course becomes a summary button and detail panel within the accordion.
 */
function renderCourses(courses) {
  const areaColors = {};
  Object.entries(genEdAreaMeta).forEach(([code, info]) => {
    if (code === 'NM|NS') {
      areaColors['NM'] = info.color;
      areaColors['NS'] = info.color;
    } else {
      areaColors[code] = info.color;
    }
  });

  const accordionId = uniqueAccordionId('course-accordion');
  let html = `<div class="rvt-accordion" data-rvt-accordion="${accordionId}">`;
  courses.forEach(c => {
    const codes = Array.isArray(c.gened) ? c.gened : [c.gened];
    const code = codes[0];
    const color = areaColors[code] || '#888';
    const id = `course-${c.id}`;
    const summary = `
      <span class="rvt-badge" style="background:${color}; border-color:${color}">${code}</span>
      <span class="rvt-ts-16 rvt-m-left-sm rvt-text-bold">${c.subj} ${c.nbr}</span>
      <span class="rvt-m-left-md">${c.desc}</span>
    `.trim();
    html += `
      <h4 class="rvt-accordion__summary rvt-border-bottom">
        <button class="rvt-accordion__toggle rvt-p-all-md" id="${id}-label" data-rvt-accordion-trigger="${id}" aria-expanded="false">
          <span class="rvt-accordion__toggle-text">
            ${summary}
          </span>
          <div class="rvt-accordion__toggle-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
              <g fill="currentColor">
                <path class="rvt-accordion__icon-bar" d="M8,15a1,1,0,0,1-1-1V2A1,1,0,0,1,9,2V14A1,1,0,0,1,8,15Z"></path>
                <path d="M14,9H2A1,1,0,0,1,2,7H14a1,1,0,0,1,0,2Z"></path>
              </g>
            </svg>
          </div>
        </button>
      </h4>
      <div class="rvt-accordion__panel" id="${id}" data-rvt-accordion-panel="${id}">
        ${renderCourseDetails(c)}
      </div>`;
  });
  html += '</div>';
  return html;
}

function renderCourseDetails(course) {
  let html = '';
  if (course.description) {
    html += `<p>${course.description}</p>`;
  } else if (course.desc) {
    html += `<p>${course.desc}</p>`;
  }
  if (course.department && course.department.CRS_SUBJ_DESC) {
    html += `<p><strong>Department:</strong> ${course.department.CRS_SUBJ_DESC}</p>`;
  }
  if (course.interestCategoryLabels && course.interestCategoryLabels.length) {
    html += `<p><strong>Interest Categories:</strong> ${course.interestCategoryLabels.join(', ')}</p>`;
  }
  if (course.interests && course.interests.length) {
    html += `<p><strong>Interests:</strong> ${course.interests.join(', ')}</p>`;
  }
  if (course.available && course.available.length) {
    const terms = course.available.map(a => a.label).join(', ');
    html += `<p><strong>Available Terms:</strong> ${terms}</p>`;
  }
  if (course.firstApprovalYearCode) {
    html += `<p><strong>First Approved:</strong> ${approvalLabel(course.firstApprovalYearCode)}</p>`;
  }
  if (course.lastApprovalYearCode) {
    html += `<p><strong>Last Approved:</strong> ${approvalLabel(course.lastApprovalYearCode)}</p>`;
  }
  return html;
}

function approvalLabel(code) {
  const start = Math.floor((code - 4100) / 10) + 2010;
  const end = start + 1;
  return `${start}\u2013${end} Academic Year`;
}

function collectText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(v => collectText(v)).join(' ');
  }
  if (typeof value === 'object') {
    return Object.values(value).map(v => collectText(v)).join(' ');
  }
  return '';
}

function captureFocus() {
  const active = document.activeElement;
  if (active && active.id) {
    lastFocusedId = active.id;
  } else {
    lastFocusedId = null;
  }
}

function returnFocus() {
  if (!lastFocusedId) return;
  const el = document.getElementById(lastFocusedId);
  if (el) {
    el.focus();
  } else if (lastFocusedId.startsWith('pagination-')) {
    const current = document.querySelector('.pagination-btn[aria-current="page"]');
    if (current) current.focus();
  } else {
    const heading = document.querySelector('#course-list h3');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
      heading.removeAttribute('tabindex');
    }
  }
  lastFocusedId = null;
}

function renderPagination() {
  const totalPages = Math.ceil(filteredCourses.length / pageSize);
  if (totalPages <= 1) return '';
  let html = '<nav role="navigation" aria-label="Pagination" class="rvt-m-top-md">';
  html += '<ul class="rvt-pagination">';

  const addBtn = (labelHtml, page, ariaLabel, isCurrent = false) => {
    html += '<li class="rvt-pagination__item">';
    html += `<a href="#0" id="pagination-${page}" class="rvt-pagination__link pagination-btn" aria-label="${ariaLabel}" data-page="${page}"`;
    if (isCurrent) html += ' aria-current="page"';
    html += `>${labelHtml}</a>`;
    html += '</li>';
  };

  if (currentPage > 1) {
    addBtn(icons.first, 1, 'First page');
    addBtn(icons.prev, currentPage - 1, 'Previous page');
  }

  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  for (let i = startPage; i <= endPage; i++) {
    addBtn(String(i), i, `Page ${i}`, i === currentPage);
  }

  if (currentPage < totalPages) {
    addBtn(icons.next, currentPage + 1, 'Next page');
    addBtn(icons.last, totalPages, 'Last page');
  }

  html += '</ul></nav>';
  return html;
}

function render() {
  const container = document.querySelector('#course-list');
  captureFocus();
  const start = (currentPage - 1) * pageSize;
  const pageCourses = filteredCourses.slice(start, start + pageSize);
  const showingStart = filteredCourses.length ? start + 1 : 0;
  const showingEnd = Math.min(start + pageSize, filteredCourses.length);
  let html = `<h3>${filteredCourses.length} Courses`;
  if (filteredCourses.length) {
    html += ` (Showing Courses ${showingStart}-${showingEnd})`;
  }
  html += `</h3>`;
  html += renderCourses(pageCourses);
  html += renderPagination();
  container.innerHTML = html;
  if (window.Rivet && typeof window.Rivet.init === 'function') {
    // Rivet was initialized globally, so dynamically added accordions are
    // automatically picked up by its MutationObserver.
  } else {
    setupAccordions(container);
  }
  returnFocus();
}

function setupAccordions(root) {
  root.querySelectorAll('.rvt-accordion__toggle').forEach(btn => {
    const target = btn.getAttribute('data-rvt-accordion-trigger');
    const panel = root.querySelector(`[data-rvt-accordion-panel="${target}"]`);
    if (panel) {
      panel.style.display = 'none';
    }
    btn.addEventListener('click', e => {
      e.preventDefault();
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      if (panel) {
        panel.style.display = expanded ? 'none' : '';
      }
    });
  });
}

function stateToHash(filters, page) {
  const params = new URLSearchParams();
  if (filters.areas && filters.areas.length && !filters.areas.includes('all')) {
    params.set('areas', filters.areas.join(','));
  }
  if (filters.interests && filters.interests.length) {
    params.set('interests', filters.interests.join(','));
  }
  if (filters.departments && filters.departments.length) {
    params.set('departments', filters.departments.join(','));
  }
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.approvalTerm) params.set('approval', filters.approvalTerm);
  if (page > 1) params.set('page', String(page));
  return params.toString();
}

function hashToState(hash) {
  if (hash.startsWith('#')) hash = hash.slice(1);
  const params = new URLSearchParams(hash);
  const filters = {
    areas: params.get('areas') ? params.get('areas').split(',').filter(Boolean) : [],
    interests: params.get('interests') ? params.get('interests').split(',').filter(Boolean) : [],
    departments: params.get('departments') ? params.get('departments').split(',').filter(Boolean) : [],
    keyword: params.get('keyword') || '',
    approvalTerm: params.get('approval') || null
  };
  const page = parseInt(params.get('page'), 10) || 1;
  return { filters, page };
}

function updateHistory(replace = false) {
  if (!currentFilters) return;
  const hash = stateToHash(currentFilters, currentPage);
  const url = hash ? `#${hash}` : '';
  const state = { filters: currentFilters, page: currentPage };
  if (replace) {
    history.replaceState(state, '', url);
  } else {
    history.pushState(state, '', url);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const initState = hashToState(location.hash);
  pendingFilters = initState.filters;

  const courses = await getAllCourses();
  initInterface(courses, handleFilterChange);
  setFilters(document.querySelector('#interface'), initState.filters);
  await loadCourses();

  currentPage = initState.page;
  render();
  updateHistory(true);

  document.querySelector('#course-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.pagination-btn');
    if (btn) {
      e.preventDefault();
      currentPage = parseInt(btn.dataset.page, 10);
      render();
      updateHistory();
    }
  });
});

window.addEventListener('popstate', (e) => {
  const state = e.state || hashToState(location.hash);
  const root = document.querySelector('#interface');
  setFilters(root, state.filters);
  applyFilters(state.filters);
  currentPage = state.page;
  render();
});

function applyFilters(filters) {
  currentFilters = filters;
  if (!allCourses.length) {
    pendingFilters = filters;
    return;
  }
  filteredCourses = allCourses.filter(c => {
    // areas
    if (filters.areas && filters.areas.length && !filters.areas.includes('all')) {
      const codes = Array.isArray(c.gened) ? c.gened : [c.gened];
      const matchArea = filters.areas.some(a => {
        if (a === 'NM|NS') {
          return codes.includes('NM') || codes.includes('NS');
        }
        return codes.includes(a);
      });
      if (!matchArea) return false;
    }

    if (filters.departments && filters.departments.length) {
      const code = c.department && c.department.CRS_SUBJ_DEPT_CD;
      if (!filters.departments.includes(code)) return false;
    }

    if (filters.interests && filters.interests.length) {
      const cats = c.interestCategories || [];
      if (!filters.interests.some(i => cats.includes(i))) return false;
    }

    if (filters.keyword) {
      const q = filters.keyword.toLowerCase();
      const fields = [c.desc, c.description, c.crs_num, `${c.subj} ${c.nbr}`];
      const match = fields.some(f => f && String(f).toLowerCase().includes(q));
      if (!match) return false;
    }


    if (filters.approvalTerm) {
      const term = parseInt(filters.approvalTerm, 10);
      const first = parseInt(c.firstApprovalYearCode, 10);
      const last = c.lastApprovalYearCode ? parseInt(c.lastApprovalYearCode, 10) : NaN;
      if (!(first <= term && (isNaN(last) || last >= term))) return false;
    }

    return true;
  });
  currentPage = 1;
  render();
}

function handleFilterChange(filters) {
  applyFilters(filters);
  updateHistory();
}

function filterCourseList() {
  const root = document.querySelector('#interface');
  if (!root) return;
  const filters = collectFilters(root);
  handleFilterChange(filters);
}

export { filterCourseList, getAllCourses };
