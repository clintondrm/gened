import { initInterface } from './interface.js';

async function loadCourses() {
  const courses = await fetch('gened-data/gened-courses.json').then(r => r.json());
  const first50 = courses.slice(0, 50);
  const container = document.querySelector('#course-list');
  container.innerHTML = renderCourses(first50);
}

function renderCourses(courses) {
  let html = '<ul class="rvt-list-plain">';
  courses.forEach(c => {
    html += `<li>${c.subj} ${c.nbr}: ${c.desc}</li>`;
  });
  html += '</ul>';
  return html;
}

document.addEventListener('DOMContentLoaded', () => {
  initInterface();
  loadCourses();
});
