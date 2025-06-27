export const genEdAreaMeta = {
  'AH': { label: 'Arts & Humanities', color: '#48183D' },
  'EC': { label: 'English Composition', color: '#00385F' },
  'MM': { label: 'Mathematical Modeling', color: '#006298' },
  'NM|NS': { label: 'Natural & Math. Sciences', color: '#056E41' },
  'SH': { label: 'Social & Hist. Studies', color: '#A36B00' },
  'WC': { label: 'World Cultures', color: '#DF3603' },
  'WL': { label: 'World Languages', color: '#DC231E' }
};

const counterKey = '__genedAccordionCounter';
export function uniqueAccordionId(prefix = 'accordion') {
  if (typeof globalThis[counterKey] !== 'number') {
    globalThis[counterKey] = 0;
  }
  globalThis[counterKey] += 1;
  return `${prefix}-${globalThis[counterKey]}`;
}

let keywordInputId = 'filter-keyword';

export async function initInterface(courses, onFilterChange) {
  const container = document.querySelector('#interface');
  let interests, departments;
  try {
    // Load interface data used for filters.
    [interests, departments] = await Promise.all([
      fetch('gened-data/explore-interests.json').then(r => r.json()),
      fetch('gened-data/departments.json').then(r => r.json())
    ]);
  } catch (err) {
    // Show a placeholder alert when the filter data cannot be retrieved.
    if (container) {
      container.innerHTML = '<p class="rvt-alert rvt-alert--danger">Unable to load filter options.</p>';
    }
    console.error('Failed to load interface data', err);
    return;
  }

  container.innerHTML = buildFilters(interests, departments, courses);

  // Rivet's components are initialized globally once in index.html. The
  // library automatically handles any DOM nodes added later via its
  // MutationObserver so we no longer need to call `Rivet.init` here.

  function describeInteraction(target) {
    if (!target) return '';
    const label = target.labels && target.labels.length
      ? target.labels[0].innerText.trim()
      : (target.id || target.name || 'input');
    if (target.type === 'checkbox') {
      return `${label} ${target.checked ? 'checked' : 'unchecked'}`;
    }
    if (target.type === 'radio') {
      return `${label} selected`;
    }
    if (target.type === 'text') {
      return `${label} set to "${target.value}"`;
    }
    return `${label} changed`;
  }

  function handleChange(e) {
    if (e && e.target) {
      console.log(`Interface interaction: ${describeInteraction(e.target)}`);
    } else {
      console.log('Interface interaction occurred');
    }
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

  const keywordInput = container.querySelector(`#${keywordInputId}`);
  if (keywordInput) {
    keywordInput.addEventListener('keyup', handleChange);
  }

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
    handleChange(e);
  }

  allArea.addEventListener('change', handleAreaChange);
  areaBoxes.forEach(cb => cb.addEventListener('change', handleAreaChange));

  handleChange();
}

function buildFilters(interests, departments, courses) {

  const approvalTerms = collectApprovalTerms(courses);

  let html = '';
  html += '<div class="rvt-p-all-none">';
  html += '<h3 class="rvt-ts-md rvt-bold rvt-m-bottom-sm">Filters</h3>';
  const accId = uniqueAccordionId('filter-accordion');
  html += `<div class="rvt-accordion filter-accordion rvt-m-bottom-md" data-rvt-accordion="${accId}">`;

  // GenEd areas
  html += accordionSection('areas', 'GenEd Areas', buildGenEdAreaList(genEdAreaMeta), true);
  // Keyword filter
  keywordInputId = uniqueAccordionId('keyword-search');
  html += accordionSection('keyword', 'Keyword filter', `<label for="${keywordInputId}" class="rvt-label rvt-m-all-remove">Search by Keyword:</label><input class="triggerFetch" type="text" id="${keywordInputId}">`, true);
  // Interest categories
  html += accordionSection('interests', 'Interest Categories', buildInterestList(interests));
  // Departments
  html += accordionSection('department', 'Course Departments', buildDepartmentList(departments, courses));
  // Historical approvals
  html += accordionSection('approval-terms', 'Historical approvals', buildApprovalList(approvalTerms));

  html += '</div></div>';
  return html;
}

function accordionSection(key, title, innerHtml, init = false) {
  const id = `filter-${key}`;
  const initAttr = init ? ' data-rvt-accordion-panel-init="true"' : '';
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
  <div class="rvt-accordion__panel" id="${id}" data-rvt-accordion-panel="${id}"${initAttr}>${innerHtml}</div>`;
}

/**
 * Create a fieldset containing checkboxes for each GenEd area.
 * The list begins with an "All" option followed by a badge labeled option
 * for every area defined in the metadata.
 */
function buildGenEdAreaList(meta) {
  const items = Object.entries(meta).map(([code, info]) => {
    const display = code === 'NM|NS' ? 'NM' : code;
    const id = `area-checkbox-${display.toLowerCase()}`;
    return `
      <li>
        <div class="rvt-checkbox">
          <input class="triggerFetch" type="checkbox" name="area-checkboxes"
                 data-value="${code}" id="${id}">
          <label for="${id}">
            <span class="rvt-badge" style="font-size:14px; margin-right:5px; min-width:44px; text-align:center; border-color: ${info.color}; background: ${info.color}">
              ${display}
            </span> ${info.label}
          </label>
        </div>
      </li>`;
  }).join('');

  return `
    <fieldset class="rvt-fieldset" id="gened-area-filter">
      <legend class="rvt-sr-only">GenEd Areas</legend>
      <ul class="rvt-list-plain rvt-width-xl">
        <li>
          <div class="rvt-checkbox">
            <input class="triggerFetch" type="checkbox" name="area-checkboxes" data-value="all" id="area-checkbox-all" checked>
            <label for="area-checkbox-all">All GenEd Areas</label>
          </div>
        </li>${items}
      </ul>
    </fieldset>
  `.trim();
}

function buildInterestList(interests) {
  let html = '<fieldset class="rvt-fieldset"><legend class="rvt-sr-only">Interest Categories</legend><ul class="rvt-list-plain rvt-width-xl">';
  interests.forEach(cat => {
    html += `<li><div class="rvt-checkbox"><input class="triggerFetch" type="checkbox" name="interest-checkboxes" data-value="${cat.value}" id="interest-checkbox-${cat.value}"><label for="interest-checkbox-${cat.value}">${cat.label}</label></div></li>`;
  });
  html += '</ul></fieldset>';
  return html;
}

function buildDepartmentList(departments, courses) {
  // Build a set of department codes that actually appear in the GenEd course
  // data so we can filter the large department list down to only those that are
  // relevant for the interface.
  const courseDepts = new Set();
  if (Array.isArray(courses)) {
    courses.forEach(c => {
      const code = c.department && c.department.CRS_SUBJ_DEPT_CD;
      if (code) courseDepts.add(code);
    });
  }

  const map = new Map();
  Object.values(departments).forEach(d => {
    if (!courseDepts.size || courseDepts.has(d.CRS_SUBJ_DEPT_CD)) {
      if (!map.has(d.CRS_SUBJ_DEPT_CD)) {
        map.set(d.CRS_SUBJ_DEPT_CD, { code: d.CRS_SUBJ_DEPT_CD, label: d.CRS_SUBJ_DESC });
      }
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


function buildApprovalList(codes) {
  let html = '<fieldset class="rvt-fieldset"><legend class="rvt-sr-only">Historical approvals</legend><ul class="rvt-list-plain rvt-width-xl">';
  codes.forEach((code, idx) => {
    const label = approvalLabel(code);
    html += `<li><div class="rvt-radio"><input class="triggerFetch" type="radio" name="approval-terms" data-label="${label}" id="approval-terms-radio-${code}" data-value="${code}"${idx===0?' checked':''}><label for="approval-terms-radio-${code}">${label}</label></div></li>`;
  });
  html += '</ul></fieldset>';
  return html;
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
  const approval = root.querySelector('input[name="approval-terms"]:checked');
  const keyword = root.querySelector(`#${keywordInputId}`);
  return {
    areas,
    interests,
    departments,
    approvalTerm: approval ? approval.dataset.value : null,
    keyword: keyword ? keyword.value : ''
  };
}

export { collectFilters };
