export const genEdAreaMeta = {
  'AH': { label: 'Arts & Humanities', color: '#48183D' },
  'EC': { label: 'English Composition', color: '#00385F' },
  'MM': { label: 'Mathematical Modeling', color: '#006298' },
  'NM|NS': { label: 'Natural & Math. Sciences', color: '#056E41' },
  'SH': { label: 'Social & Hist. Studies', color: '#A36B00' },
  'WC': { label: 'World Cultures', color: '#DF3603' },
  'WL': { label: 'World Languages', color: '#DC231E' }
};

export async function initInterface(onFilterChange) {
  const [interests, departments, courses] = await Promise.all([
    fetch('gened-data/explore-interests.json').then(r => r.json()),
    fetch('gened-data/departments.json').then(r => r.json()),
    fetch('gened-data/explore-gened.json').then(r => r.json())
  ]);

  const container = document.querySelector('#interface');
  container.innerHTML = buildFilters(interests, departments, courses);
  if (window.Rivet && typeof window.Rivet.init === 'function') {
    window.Rivet.init(container);
  }

  function handleChange() {
    if (typeof onFilterChange === 'function') {
      onFilterChange(collectFilters(container));
    }
  }


  // General change listeners for all triggers except the GenEd area checkboxes.
  const nonAreaTriggers = Array.from(container.querySelectorAll('.triggerFetch'))
    .filter(el => el.name !== 'area-checkboxes');
  nonAreaTriggers.forEach(el => {
    el.addEventListener('change', handleChange);
    el.addEventListener('input', handleChange);
  });

  // Special behavior for GenEd Area checkboxes
  const allArea = container.querySelector('#area-checkbox-all');
  const areaBoxes = Array.from(container.querySelectorAll('input[name="area-checkboxes"]'))
    .filter(el => el !== allArea);

  function handleAreaChange(e) {
    if (e.target === allArea) {
      if (allArea.checked) {
        areaBoxes.forEach(cb => { cb.checked = false; });
      }
    } else {
      if (e.target.checked) {
        allArea.checked = false;
      } else if (!areaBoxes.some(cb => cb.checked)) {
        allArea.checked = true;
      }
    }
    handleChange();
  }

  allArea.addEventListener('change', handleAreaChange);
  areaBoxes.forEach(cb => cb.addEventListener('change', handleAreaChange));

  handleChange();
}

function buildFilters(interests, departments, courses) {

  const openTerms = collectOpenTerms(courses);
  const approvalTerms = collectApprovalTerms(courses);

  let html = '';
  html += '<div class="rvt-p-all-none">';
  html += '<h3 class="rvt-ts-md rvt-bold rvt-m-bottom-sm">Filters</h3>';
  html += '<div class="rvt-accordion filter-accordion rvt-m-bottom-md" data-rvt-accordion="filter-accordion">';

  // GenEd areas
  html += accordionSection('areas', 'GenEd Areas', buildGenEdAreaList(genEdAreaMeta));
  // Keyword filter
  html += accordionSection('keyword', 'Keyword filter', '<label for="filter-keyword" class="rvt-label rvt-m-all-remove">Search by Keyword:</label><input class="triggerFetch" type="text" id="filter-keyword">');
  // Interest categories
  html += accordionSection('interests', 'Interest Categories', buildInterestList(interests));
  // Departments
  html += accordionSection('department', 'Course Departments', buildDepartmentList(departments));
  // Open seats
  html += accordionSection('openseats', 'Courses with open seats', buildOpenSeatsList(openTerms));
  // Historical approvals
  html += accordionSection('approval-terms', 'Historical approvals', buildApprovalList(approvalTerms));

  html += '</div></div>';
  return html;
}

function accordionSection(key, title, innerHtml) {
  const id = `filter-${key}`;
  return `<h4 class="rvt-accordion__summary">
    <button class="rvt-accordion__toggle" id="${id}-label" data-rvt-accordion-trigger="${id}" aria-expanded="false">
      <span class="rvt-accordion__toggle-text${key==='areas'? ' rvt-ts-sm':''}">${title}</span>
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
  <div class="rvt-accordion__panel" id="${id}" data-rvt-accordion-panel="${id}" data-rvt-accordion-panel-init="true">${innerHtml}</div>`;
}

function buildGenEdAreaList(meta) {
  let html = '<fieldset class="rvt-fieldset"><legend class="rvt-sr-only">GenEd Areas</legend><ul class="rvt-list-plain rvt-width-xl">';
  html += `<li><div class="rvt-checkbox"><input class="triggerFetch" type="checkbox" name="area-checkboxes" data-value="all" id="area-checkbox-all" checked><label for="area-checkbox-all">All GenEd Areas</label></div></li>`;
  Object.entries(meta).forEach(([code, info]) => {
    html += `<li><div class="rvt-checkbox"><input class="triggerFetch" type="checkbox" name="area-checkboxes" data-value="${code}" id="area-checkbox-${code.toLowerCase().replace('|','')}"><label for="area-checkbox-${code.toLowerCase().replace('|','')}"><span class="rvt-badge rvt-badge--info" style="font-size:14px; margin-right:5px; min-width:44px; text-align:center; border-color: ${info.color}; background: ${info.color}">${code.replace('|','')}</span> ${info.label}</label></div></li>`;
  });
  html += '</ul></fieldset>';
  return html;
}

function buildInterestList(interests) {
  let html = '<fieldset class="rvt-fieldset"><legend class="rvt-sr-only">Interest Categories</legend><ul class="rvt-list-plain rvt-width-xl">';
  interests.forEach(cat => {
    html += `<li><div class="rvt-checkbox"><input class="triggerFetch" type="checkbox" name="interest-checkboxes" data-value="${cat.value}" id="interest-checkbox-${cat.value}"><label for="interest-checkbox-${cat.value}">${cat.label}</label></div></li>`;
  });
  html += '</ul></fieldset>';
  return html;
}

function buildDepartmentList(departments) {
  const map = new Map();
  Object.values(departments).forEach(d => {
    if (!map.has(d.CRS_SUBJ_DEPT_CD)) {
      map.set(d.CRS_SUBJ_DEPT_CD, { code: d.CRS_SUBJ_DEPT_CD, label: d.CRS_SUBJ_DESC });
    }
  });
  const entries = Array.from(map.values());
  entries.sort((a, b) => a.label.localeCompare(b.label));
  let html = '<fieldset class="rvt-fieldset"><legend class="rvt-sr-only">Course Departments</legend><ul class="rvt-list-plain rvt-width-xl">';
  entries.forEach(dep => {
    html += `<li><div class="rvt-checkbox"><input class="triggerFetch" type="checkbox" name="department-checkboxes" data-value="${dep.code}" id="department-checkbox-${dep.code}"><label for="department-checkbox-${dep.code}">${dep.label}</label></div></li>`;
  });
  html += '</ul></fieldset>';
  return html;
}

function buildOpenSeatsList(terms) {
  let html = '<fieldset class="rvt-fieldset"><legend class="rvt-sr-only">Courses with open seats</legend><ul class="rvt-list-plain rvt-width-xl">';
  terms.forEach(t => {
    html += `<li><div class="rvt-radio"><input class="triggerFetch" type="radio" name="openseats-radios" data-value="${t.term}" id="openseats-radios-${t.term}"><label for="openseats-radios-${t.term}">${t.label}</label></div></li>`;
  });
  html += '</ul></fieldset>';
  return html;
}

function buildApprovalList(codes) {
  let html = '<fieldset class="rvt-fieldset"><legend class="rvt-sr-only">Historical approvals</legend><ul class="rvt-list-plain rvt-width-xl">';
  codes.forEach((code, idx) => {
    const label = approvalLabel(code);
    html += `<li><div class="rvt-radio"><input class="triggerFetch" type="radio" name="approval-terms" data-label="${label}" id="approval-terms-radio-${code}" data-value="${code}"${idx===0?' checked':''}><label for="approval-terms-radio-${code}">${label}</label></div></li>`;
  });
  html += '</ul></fieldset>';
  return html;
}

function collectOpenTerms(courses) {
  const map = new Map();
  courses.forEach(c => {
    if (Array.isArray(c.available)) {
      c.available.forEach(a => {
        if (!map.has(a.term)) map.set(a.term, a.label);
      });
    }
  });
  return Array.from(map.entries()).map(([term,label])=>({term,label})).sort((a,b)=>a.term-b.term);
}

function collectApprovalTerms(courses) {
  const set = new Set();
  courses.forEach(c => { if(c.firstApprovalYearCode) set.add(parseInt(c.firstApprovalYearCode)); });
  return Array.from(set).sort((a,b)=>b-a);
}

function approvalLabel(code) {
  const start = Math.floor((code - 4100)/10) + 2010;
  const end = start + 1;
  return `${start}\u2013${end} Academic Year`;
}

function collectFilters(root) {
  const areas = Array.from(root.querySelectorAll('input[name="area-checkboxes"]:checked')).map(el => el.dataset.value);
  const interests = Array.from(root.querySelectorAll('input[name="interest-checkboxes"]:checked')).map(el => el.dataset.value);
  const departments = Array.from(root.querySelectorAll('input[name="department-checkboxes"]:checked')).map(el => el.dataset.value);
  const open = root.querySelector('input[name="openseats-radios"]:checked');
  const approval = root.querySelector('input[name="approval-terms"]:checked');
  const keyword = root.querySelector('#filter-keyword');
  return {
    areas,
    interests,
    departments,
    openseats: open ? open.dataset.value : null,
    approvalTerm: approval ? approval.dataset.value : null,
    keyword: keyword ? keyword.value : ''
  };
}

export { collectFilters };
