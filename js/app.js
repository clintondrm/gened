import { initInterface } from './interface.js';

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
  const badgeClass = {
    'AH': 'teal',
    'EC': 'orange',
    'MM': 'orange',
    'NM': 'green',
    'NS': 'green',
    'SH': 'blue',
    'WC': 'purple',
    'WL': 'red'
  };

  let html = '<ul class="rvt-list-plain">';
  courses.forEach(c => {
    const codes = Array.isArray(c.gened) ? c.gened : [c.gened];
    const code = codes[0];
    const color = badgeClass[code] || 'info';
    html += `<li class="rvt-border-bottom rvt-p-top-sm rvt-p-bottom-sm">` +
            `<span class="rvt-badge rvt-badge--${color}">${code}</span>` +
            `<span class="rvt-ts-16 rvt-m-left-sm rvt-text-bold">${c.subj} ${c.nbr}</span>` +
            `<span class="rvt-m-left-md">${c.desc}</span>` +
            `</li>`;
  });
  html += '</ul>';
  return html;
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
      const txt = `${c.desc || ''} ${c.description || ''}`.toLowerCase();
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
