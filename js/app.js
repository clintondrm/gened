import { initInterface, genEdAreaMeta, collectFilters } from './interface.js';

const pageSize = 50;
let allCourses = [];
let filteredCourses = [];
let currentPage = 1;
let pendingFilters = null;

async function loadCourses() {
  allCourses = await fetch('gened-data/explore-gened.json').then(r => r.json());
  if (pendingFilters) {
    applyFilters(pendingFilters);
    pendingFilters = null;
  } else {
    filteredCourses = allCourses;
    render();
  }
}

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

  let html = '<div class="rvt-accordion" data-rvt-accordion="course-accordion">';
  courses.forEach(c => {
    const codes = Array.isArray(c.gened) ? c.gened : [c.gened];
    const code = codes[0];
    const color = areaColors[code] || 'info';
    const id = `course-${c.id}`;
    const summary = `<span class="rvt-badge rvt-badge--${color}">${code}</span>` +
                    `<span class="rvt-ts-16 rvt-m-left-sm rvt-text-bold">${c.subj} ${c.nbr}</span>` +
                    `<span class="rvt-m-left-md">${c.desc}</span>`;
    html += `<h4 class="rvt-accordion__summary rvt-border-bottom">` +
            `<button class="rvt-accordion__toggle" id="${id}-label" data-rvt-accordion-trigger="${id}" aria-expanded="false">` +
            `<span class="rvt-accordion__toggle-text">${summary}</span>` +
            `<div class="rvt-accordion__toggle-icon">` +
            `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">` +
            `<g fill="currentColor">` +
            `<path class="rvt-accordion__icon-bar" d="M8,15a1,1,0,0,1-1-1V2A1,1,0,0,1,9,2V14A1,1,0,0,1,8,15Z"></path>` +
            `<path d="M14,9H2A1,1,0,0,1,2,7H14a1,1,0,0,1,0,2Z"></path>` +
            `</g>` +
            `</svg>` +
            `</div>` +
            `</button>` +
            `</h4>` +
            `<div class="rvt-accordion__panel" id="${id}" data-rvt-accordion-panel="${id}" data-rvt-accordion-panel-init="true">${renderCourseDetails(c)}</div>`;
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

function renderPagination() {
  const totalPages = Math.ceil(filteredCourses.length / pageSize);
  if (totalPages <= 1) return '';
  let html = '<nav role="navigation" aria-label="Pagination" class="rvt-m-top-md">';
  html += '<ul class="rvt-pagination">';
  for (let i = 1; i <= totalPages; i++) {
    html += '<li class="rvt-pagination__item">';
    if (i === currentPage) {
      html += `<a href="#0" class="rvt-pagination__link pagination-btn" aria-label="Page ${i}" aria-current="page" data-page="${i}">${i}</a>`;
    } else {
      html += `<a href="#0" class="rvt-pagination__link pagination-btn" aria-label="Page ${i}" data-page="${i}">${i}</a>`;
    }
    html += '</li>';
  }
  html += '</ul></nav>';
  return html;
}

function render() {
  const container = document.querySelector('#course-list');
  const start = (currentPage - 1) * pageSize;
  const pageCourses = filteredCourses.slice(start, start + pageSize);
  let html = `<h3>${filteredCourses.length} course results</h3>`;
  html += renderCourses(pageCourses);
  html += renderPagination();
  container.innerHTML = html;
  setupAccordions(container);
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

document.addEventListener('DOMContentLoaded', () => {
  initInterface(applyFilters);
  loadCourses();

  document.querySelector('#course-list').addEventListener('click', (e) => {
    const btn = e.target.closest('.pagination-btn');
    if (btn) {
      e.preventDefault();
      currentPage = parseInt(btn.dataset.page, 10);
      render();
    }
  });
});

function applyFilters(filters) {
  if (!allCourses.length) {
    pendingFilters = filters;
    return;
  }
  filteredCourses = allCourses.filter(c => {
    // areas
    if (filters.areas && filters.areas.length && !filters.areas.includes('all')) {
      const codes = Array.isArray(c.gened) ? c.gened : [c.gened];
      if (!filters.areas.some(a => codes.includes(a))) return false;
    }

    if (filters.departments && filters.departments.length) {
      const code = c.department && c.department.CRS_SUBJ_DEPT_CD;
      if (!filters.departments.includes(code)) return false;
    }

    if (filters.interests && filters.interests.length) {
      if (!c.interests || !filters.interests.some(i => c.interests.includes(i))) return false;
    }

    if (filters.keyword) {
      const q = filters.keyword.toLowerCase();
      const txt = collectText(c).toLowerCase();
      if (!txt.includes(q)) return false;
    }

    if (filters.openseats) {
      if (!c.available || !c.available.some(a => String(a.term) === String(filters.openseats))) return false;
    }

    if (filters.approvalTerm) {
      if (String(c.firstApprovalYearCode) !== String(filters.approvalTerm)) return false;
    }

    return true;
  });
  currentPage = 1;
  render();
}

function filterCourseList() {
  const root = document.querySelector('#interface');
  if (!root) return;
  const filters = collectFilters(root);
  applyFilters(filters);
}

export { filterCourseList };
