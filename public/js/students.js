// Students Management Controller

let studentSearchTimeout = null;

async function loadStudents() {
  const search = document.getElementById('students-search') ? document.getElementById('students-search').value : '';
  const dept = document.getElementById('students-dept-filter') ? document.getElementById('students-dept-filter').value : '';
  const status = document.getElementById('students-status-filter') ? document.getElementById('students-status-filter').value : '';

  try {
    const res = await apiRequest(`/students?search=${encodeURIComponent(search)}&department=${encodeURIComponent(dept)}&status=${encodeURIComponent(status)}`);
    renderStudentsTable(res.data || []);
  } catch (error) {
    showToast('Failed to load students list.', 'danger');
  }
}

function handleStudentSearch() {
  clearTimeout(studentSearchTimeout);
  studentSearchTimeout = setTimeout(() => {
    loadStudents();
  }, 300);
}

function renderStudentsTable(students) {
  const tbody = document.getElementById('students-table-body');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 2rem;">No matching students found.</td></tr>';
    return;
  }

  const isAdmin = currentUser && currentUser.role === 'admin';

  tbody.innerHTML = students.map(s => `
    <tr>
      <td><span class="badge badge-primary">${s.student_id_code}</span></td>
      <td>
        <strong>${s.first_name} ${s.last_name}</strong>
        ${s.gender ? `<br><small class="text-muted">${s.gender}</small>` : ''}
      </td>
      <td>${s.email}</td>
      <td>${s.department}</td>
      <td>${s.phone || '—'}</td>
      <td>
        <span class="badge badge-${s.status === 'Active' ? 'success' : (s.status === 'Suspended' ? 'danger' : 'gray')}">
          ${s.status}
        </span>
      </td>
      <td class="text-right">
        <button class="btn btn-sm btn-outline" title="View Full Profile" onclick="viewStudentDetail(${s.id})">
          <i class="fa-regular fa-eye"></i> View
        </button>
        ${isAdmin ? `
          <button class="btn btn-sm btn-outline" title="Edit Student" onclick="openEditStudentModal(${s.id})">
            <i class="fa-regular fa-pen-to-square"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" title="Delete Student" onclick="deleteStudent(${s.id}, '${s.first_name} ${s.last_name}')">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

function openAddStudentModal() {
  document.getElementById('student-modal-title').textContent = 'Add New Student';
  document.getElementById('student-form').reset();
  document.getElementById('student-form-id').value = '';
  openModal('student-modal');
}

async function openEditStudentModal(id) {
  try {
    const res = await apiRequest(`/students/${id}`);
    const s = res.student;

    document.getElementById('student-modal-title').textContent = 'Edit Student Information';
    document.getElementById('student-form-id').value = s.id;
    document.getElementById('sf-first-name').value = s.first_name || '';
    document.getElementById('sf-last-name').value = s.last_name || '';
    document.getElementById('sf-email').value = s.email || '';
    document.getElementById('sf-phone').value = s.phone || '';
    document.getElementById('sf-dept').value = s.department || 'Computer Science';
    document.getElementById('sf-gender').value = s.gender || 'Male';
    document.getElementById('sf-dob').value = s.dob || '';
    document.getElementById('sf-status').value = s.status || 'Active';
    document.getElementById('sf-address').value = s.address || '';
    document.getElementById('sf-guardian-name').value = s.guardian_name || '';
    document.getElementById('sf-guardian-phone').value = s.guardian_phone || '';

    openModal('student-modal');
  } catch (error) {
    showToast('Failed to load student details for editing.', 'danger');
  }
}

async function handleSaveStudent(e) {
  e.preventDefault();
  const id = document.getElementById('student-form-id').value;
  const isEdit = Boolean(id);

  const payload = {
    first_name: document.getElementById('sf-first-name').value,
    last_name: document.getElementById('sf-last-name').value,
    email: document.getElementById('sf-email').value,
    phone: document.getElementById('sf-phone').value,
    department: document.getElementById('sf-dept').value,
    gender: document.getElementById('sf-gender').value,
    dob: document.getElementById('sf-dob').value,
    status: document.getElementById('sf-status').value,
    address: document.getElementById('sf-address').value,
    guardian_name: document.getElementById('sf-guardian-name').value,
    guardian_phone: document.getElementById('sf-guardian-phone').value
  };

  try {
    const url = isEdit ? `/students/${id}` : '/students';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiRequest(url, {
      method,
      body: JSON.stringify(payload)
    });

    showToast(res.message || 'Student saved successfully.', 'success');
    closeModal('student-modal');
    loadStudents();
    loadDashboard();
  } catch (error) {
    showToast(error.message || 'Failed to save student.', 'danger');
  }
}

async function deleteStudent(id, name) {
  if (!confirm(`Are you sure you want to permanently delete student: ${name}? All associated attendance, grade, and fee records will also be deleted.`)) {
    return;
  }

  try {
    const res = await apiRequest(`/students/${id}`, { method: 'DELETE' });
    showToast(res.message || 'Student deleted successfully.', 'success');
    loadStudents();
    loadDashboard();
  } catch (error) {
    showToast(error.message || 'Failed to delete student.', 'danger');
  }
}

async function viewStudentDetail(id) {
  try {
    const res = await apiRequest(`/students/${id}`);
    const s = res.student;
    const courses = res.courses || [];
    const grades = res.grades || [];
    const attStats = res.attendanceStats || {};
    const attHistory = res.attendanceHistory || [];
    const fees = res.fees || [];

    const totalDays = attStats.total_days || 0;
    const attPercent = totalDays > 0 ? Math.round(((attStats.present_days + attStats.late_days) / totalDays) * 100) : 100;

    const modalBody = document.getElementById('student-detail-body');
    modalBody.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1.25rem; margin-bottom: 1.5rem; padding-bottom: 1.25rem; border-bottom: 1px solid #e2e8f0;">
        <div class="user-avatar" style="width: 60px; height: 60px; font-size: 1.3rem;">
          ${s.first_name[0]}${s.last_name[0]}
        </div>
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 800; color: #0f172a;">${s.first_name} ${s.last_name}</h2>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.35rem; align-items: center;">
            <span class="badge badge-primary">${s.student_id_code}</span>
            <span class="badge badge-gray">${s.department}</span>
            <span class="badge badge-${s.status === 'Active' ? 'success' : 'danger'}">${s.status}</span>
          </div>
        </div>
      </div>

      <!-- Quick Stats Strip -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; border-radius: 8px;">
          <small style="color: #64748b; font-weight: 600;">Enrolled Courses</small>
          <div style="font-size: 1.3rem; font-weight: 700; color: #1e293b;">${courses.length}</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; border-radius: 8px;">
          <small style="color: #64748b; font-weight: 600;">Attendance Rate</small>
          <div style="font-size: 1.3rem; font-weight: 700; color: #10b981;">${attPercent}%</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; border-radius: 8px;">
          <small style="color: #64748b; font-weight: 600;">Recorded Grades</small>
          <div style="font-size: 1.3rem; font-weight: 700; color: #4f46e5;">${grades.length}</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; border-radius: 8px;">
          <small style="color: #64748b; font-weight: 600;">Fee Invoices</small>
          <div style="font-size: 1.3rem; font-weight: 700; color: #f59e0b;">${fees.length}</div>
        </div>
      </div>

      <!-- Tabs or Sections -->
      <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;"><i class="fa-solid fa-address-card"></i> Personal Information</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background: #f8fafc; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.875rem;">
        <div><strong>Email:</strong> ${s.email}</div>
        <div><strong>Phone:</strong> ${s.phone || '—'}</div>
        <div><strong>Gender:</strong> ${s.gender || '—'}</div>
        <div><strong>Date of Birth:</strong> ${s.dob || '—'}</div>
        <div><strong>Address:</strong> ${s.address || '—'}</div>
        <div><strong>Enrollment Date:</strong> ${s.enrollment_date}</div>
        <div><strong>Guardian Name:</strong> ${s.guardian_name || '—'}</div>
        <div><strong>Guardian Contact:</strong> ${s.guardian_phone || '—'}</div>
      </div>

      <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;"><i class="fa-solid fa-book"></i> Enrolled Courses & Grades</h4>
      <div class="table-responsive mb-4">
        <table class="table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Instructor</th>
              <th>Credits</th>
              <th>Score</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            ${courses.length === 0 ? '<tr><td colspan="5" class="text-center">No enrolled courses.</td></tr>' : 
              courses.map(c => {
                const g = grades.find(x => x.course_id === c.id);
                return `
                  <tr>
                    <td><strong>${c.code}</strong> - ${c.title}</td>
                    <td>${c.teacher_first_name ? `${c.teacher_first_name} ${c.teacher_last_name}` : 'Unassigned'}</td>
                    <td>${c.credits} Credits</td>
                    <td>${g ? `${g.total_score}%` : 'Pending'}</td>
                    <td><span class="badge badge-${g && g.grade_letter !== 'F' ? 'success' : 'gray'}">${g ? g.grade_letter : '—'}</span></td>
                  </tr>
                `;
              }).join('')}
          </tbody>
        </table>
      </div>

      <div class="flex-between">
        <button class="btn btn-primary btn-sm" onclick="viewTranscript(${s.id})">
          <i class="fa-solid fa-print"></i> Generate Academic Transcript
        </button>
      </div>
    `;

    openModal('student-detail-modal');
  } catch (error) {
    showToast('Failed to load student profile details.', 'danger');
  }
}
