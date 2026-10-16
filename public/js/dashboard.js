// Dashboard view management & Chart.js visualizations

let deptChartInstance = null;
let gradesChartInstance = null;

async function loadDashboard() {
  try {
    const res = await apiRequest('/dashboard/stats');
    if (!res.success) return;

    const stats = res.stats;
    const role = currentUser ? currentUser.role : 'admin';

    renderKPICards(stats, role);

    if (role === 'admin') {
      document.getElementById('dashboard-charts-row').classList.remove('hidden');
      renderDepartmentChart(stats.deptDistribution || []);
      renderGradesChart(stats.gradeDistribution || []);
      renderRecentStudents(stats.recentStudents || []);
    } else {
      document.getElementById('dashboard-charts-row').classList.add('hidden');
    }

    loadDashboardAnnouncements();
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

function renderKPICards(stats, role) {
  const container = document.getElementById('kpi-cards-container');
  if (!container) return;

  if (role === 'admin') {
    const feeCollected = stats.feeStats ? Number(stats.feeStats.total_collected).toLocaleString() : 0;
    const feeOutstanding = stats.feeStats ? Number(stats.feeStats.total_outstanding).toLocaleString() : 0;

    container.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Total Students</h4>
          <div class="kpi-value">${stats.studentCount || 0}</div>
        </div>
        <div class="kpi-icon primary"><i class="fa-solid fa-user-graduate"></i></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Faculty & Teachers</h4>
          <div class="kpi-value">${stats.teacherCount || 0}</div>
        </div>
        <div class="kpi-icon secondary"><i class="fa-solid fa-chalkboard-user"></i></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Active Courses</h4>
          <div class="kpi-value">${stats.courseCount || 0}</div>
        </div>
        <div class="kpi-icon warning"><i class="fa-solid fa-book-open"></i></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Avg Attendance</h4>
          <div class="kpi-value">${stats.attendancePercent || 100}%</div>
        </div>
        <div class="kpi-icon success"><i class="fa-solid fa-calendar-check"></i></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Fees Collected</h4>
          <div class="kpi-value">$${feeCollected}</div>
        </div>
        <div class="kpi-icon success"><i class="fa-solid fa-circle-dollar-to-slot"></i></div>
      </div>
    `;
  } else if (role === 'teacher') {
    container.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-info">
          <h4>My Courses</h4>
          <div class="kpi-value">${stats.courseCount || 0}</div>
        </div>
        <div class="kpi-icon primary"><i class="fa-solid fa-book-open"></i></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Students Enrolled</h4>
          <div class="kpi-value">${stats.studentCount || 0}</div>
        </div>
        <div class="kpi-icon secondary"><i class="fa-solid fa-user-graduate"></i></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Current Term</h4>
          <div class="kpi-value">Spring '26</div>
        </div>
        <div class="kpi-icon warning"><i class="fa-solid fa-graduation-cap"></i></div>
      </div>
    `;
  } else if (role === 'student') {
    const balance = stats.feeSummary ? stats.feeSummary.balance : 0;
    container.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Enrolled Courses</h4>
          <div class="kpi-value">${stats.enrolledCoursesCount || 0}</div>
        </div>
        <div class="kpi-icon primary"><i class="fa-solid fa-book-bookmark"></i></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-info">
          <h4>My Attendance</h4>
          <div class="kpi-value">${stats.attendancePercent || 100}%</div>
        </div>
        <div class="kpi-icon success"><i class="fa-solid fa-calendar-check"></i></div>
      </div>
      <div class="kpi-card" style="cursor: pointer;" onclick="navigateTo('fees')" title="Click to pay fees via M-Pesa (+254 746 942 848)">
        <div class="kpi-info">
          <h4>Fee Balance ${balance > 0 ? '<span class="badge badge-success" style="font-size: 0.65rem;"><i class="fa-solid fa-bolt"></i> Pay M-Pesa</span>' : ''}</h4>
          <div class="kpi-value" style="color: ${balance > 0 ? '#ef4444' : '#10b981'};">$${Number(balance).toLocaleString()}</div>
        </div>
        <div class="kpi-icon ${balance > 0 ? 'warning' : 'success'}"><i class="fa-solid fa-mobile-screen-button"></i></div>
      </div>
    `;
  }
}

function renderDepartmentChart(data) {
  const ctx = document.getElementById('deptChart');
  if (!ctx) return;

  if (deptChartInstance) {
    deptChartInstance.destroy();
  }

  const labels = data.map(d => d.department);
  const counts = data.map(d => d.count);

  deptChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['Computer Science', 'Business Admin', 'Mathematics'],
      datasets: [{
        label: 'Enrolled Students',
        data: counts.length ? counts : [4, 2, 1],
        backgroundColor: '#4f46e5',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      }
    }
  });
}

function renderGradesChart(data) {
  const ctx = document.getElementById('gradesChart');
  if (!ctx) return;

  if (gradesChartInstance) {
    gradesChartInstance.destroy();
  }

  const gradeLabels = ['A', 'B', 'C', 'D', 'F'];
  const countsMap = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  data.forEach(d => {
    if (countsMap[d.grade_letter] !== undefined) {
      countsMap[d.grade_letter] = d.count;
    }
  });

  gradesChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: gradeLabels,
      datasets: [{
        data: gradeLabels.map(l => countsMap[l] || 0),
        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function renderRecentStudents(students) {
  const tbody = document.getElementById('recent-students-tbody');
  if (!tbody) return;

  if (!students || students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No students recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = students.map(s => `
    <tr>
      <td><span class="badge badge-primary">${s.student_id_code}</span></td>
      <td><strong>${s.first_name} ${s.last_name}</strong></td>
      <td>${s.department}</td>
      <td>${s.enrollment_date}</td>
      <td><span class="badge badge-${s.status === 'Active' ? 'success' : 'gray'}">${s.status}</span></td>
    </tr>
  `).join('');
}

async function loadDashboardAnnouncements() {
  const container = document.getElementById('dashboard-announcements-list');
  if (!container) return;

  try {
    const res = await apiRequest('/announcements');
    const list = res.data ? res.data.slice(0, 3) : [];

    if (list.length === 0) {
      container.innerHTML = '<p class="text-center text-muted">No recent announcements.</p>';
      return;
    }

    container.innerHTML = list.map(a => `
      <div class="mb-3" style="border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem;">
        <div class="flex-between mb-1">
          <span class="badge badge-primary">${a.category}</span>
          <small class="text-muted">${new Date(a.created_at).toLocaleDateString()}</small>
        </div>
        <h5 style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem;">${a.title}</h5>
        <p style="font-size: 0.825rem; color: #64748b; line-height: 1.4;">${a.content.substring(0, 110)}...</p>
      </div>
    `).join('');
  } catch (e) {
    console.error('Failed to load dashboard announcements', e);
  }
}
