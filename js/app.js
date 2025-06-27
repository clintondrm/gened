import { initInterface, genEdAreaMeta } from './interface.js';

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

  let html = '<ul class="rvt-list-plain">';
  courses.forEach(c => {
    const codes = Array.isArray(c.gened) ? c.gened : [c.gened];
    const code = codes[0];
    const color = areaColors[code] || '#6c757d';
    html += `<li class="rvt-border-bottom rvt-p-top-sm rvt-p-bottom-sm">` +
            `<span class="rvt-badge rvt-badge--info" style="border-color: ${color}; background: ${color}">${code}</span>` +
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
  let html = '<nav class="rvt-pagination rvt-m-top-md" aria-label="Pagination"><ul class="rvt-pagination__list">';
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      html += `<li class="rvt-pagination__item"><span class="rvt-pagination__link" aria-current="page">${i}</span></li>`;
    } else {
      html += `<li class="rvt-pagination__item"><button class="rvt-button rvt-button--ghost rvt-pagination__link pagination-btn" data-page="${i}">${i}</button></li>`;
    }
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
