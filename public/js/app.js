// Master Application Orchestrator & Router

let currentPage = 'dashboard';

document.addEventListener('DOMContentLoaded', () => {
  // Update current date display
  const dateEl = document.getElementById('current-date-display');
  if (dateEl) {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString(undefined, options);
  }

  // Bind hash change
  window.addEventListener('hashchange', handleHashChange);

  // Close modals on clicking backdrop
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  // ESC key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(modal => {
        closeModal(modal.id);
      });
    }
  });

  // Initialize auth
  initAuth();
});

function initApp() {
  handleHashChange();
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigateTo(hash);
}

function navigateTo(page) {
  currentPage = page;

  // Update sidebar active link
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-page') === page) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Hide all pages, show target page
  document.querySelectorAll('.page-section').forEach(sec => {
    sec.classList.add('hidden');
    sec.classList.remove('active');
  });

  const targetSection = document.getElementById(`page-${page}`);
  if (targetSection) {
    targetSection.classList.remove('hidden');
    targetSection.classList.add('active');
  } else {
    // fallback to dashboard
    const dash = document.getElementById('page-dashboard');
    if (dash) {
      dash.classList.remove('hidden');
      dash.classList.add('active');
    }
  }

  // Update topbar titles
  updatePageTitles(page);

  // Trigger page specific loader
  switch (page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'students':
      loadStudents();
      break;
    case 'teachers':
      loadTeachers();
      break;
    case 'courses':
      loadCourses();
      break;
    case 'attendance':
      loadCourses().then(() => initAttendancePage());
      break;
    case 'grades':
      loadCourses().then(() => loadGrades());
      break;
    case 'fees':
      loadFees();
      break;
    case 'announcements':
      loadAnnouncements();
      break;
  }

  // Close mobile sidebar if open
  const sidebar = document.getElementById('sidebar');
  if (sidebar && window.innerWidth < 992) {
    sidebar.classList.remove('open');
  }
}

function updatePageTitles(page) {
  const titleEl = document.getElementById('current-page-title');
  const subEl = document.getElementById('current-page-subtitle');

  const titles = {
    dashboard: { title: 'Dashboard Overview', sub: 'Welcome back, view campus analytics and updates.' },
    students: { title: 'Student Management', sub: 'Manage enrolled student records, personal profiles, and statuses.' },
    teachers: { title: 'Faculty & Instructors', sub: 'Directory of academic faculty and department course assignments.' },
    courses: { title: 'Academic Courses & Classes', sub: 'Course catalog, credit distribution, and class rosters.' },
    attendance: { title: 'Daily Attendance Register', sub: 'Conduct class roll calls and monitor attendance history.' },
    grades: { title: 'Academic Performance & Grades', sub: 'Grade assignments, midterm exams, and generate official transcripts.' },
    fees: { title: 'Fees & Financial Billing', sub: 'Tuition invoices, fee tracking, and payment record management.' },
    announcements: { title: 'Campus Notice Board', sub: 'Official university notices, timetables, and campus communications.' }
  };

  if (titles[page]) {
    titleEl.textContent = titles[page].title;
    subEl.textContent = titles[page].sub;
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}

// Modal Helpers
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
}
