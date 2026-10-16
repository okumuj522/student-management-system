// Teachers & Faculty Management Controller

let teacherSearchTimeout = null;

async function loadTeachers() {
  const search = document.getElementById('teachers-search') ? document.getElementById('teachers-search').value : '';
  const dept = document.getElementById('teachers-dept-filter') ? document.getElementById('teachers-dept-filter').value : '';

  try {
    const res = await apiRequest(`/teachers?search=${encodeURIComponent(search)}&department=${encodeURIComponent(dept)}`);
    renderTeachersGrid(res.data || []);
  } catch (error) {
    showToast('Failed to load faculty directory.', 'danger');
  }
}

function handleTeacherSearch() {
  clearTimeout(teacherSearchTimeout);
  teacherSearchTimeout = setTimeout(() => {
    loadTeachers();
  }, 300);
}

function renderTeachersGrid(teachers) {
  const container = document.getElementById('teachers-cards-grid');
  if (!container) return;

  if (teachers.length === 0) {
    container.innerHTML = '<div class="col-12 text-center" style="padding: 2rem;">No faculty members found.</div>';
    return;
  }

  const isAdmin = currentUser && currentUser.role === 'admin';

  container.innerHTML = teachers.map(t => `
    <div class="entity-card">
      <div class="entity-card-header">
        <div class="entity-icon">
          ${t.first_name[0]}${t.last_name[0]}
        </div>
        <div class="entity-title-box">
          <h4>${t.first_name} ${t.last_name}</h4>
          <span>${t.designation || 'Lecturer'} &bull; ${t.department}</span>
        </div>
      </div>

      <ul class="entity-details-list">
        <li><i class="fa-solid fa-id-badge"></i> <strong>Code:</strong> ${t.teacher_id_code}</li>
        <li><i class="fa-regular fa-envelope"></i> ${t.email}</li>
        <li><i class="fa-solid fa-phone"></i> ${t.phone || 'N/A'}</li>
        <li><i class="fa-solid fa-graduation-cap"></i> ${t.qualification || 'Higher Education'}</li>
        <li><i class="fa-solid fa-book-open"></i> <strong>Assigned Courses:</strong> ${t.course_count} Courses</li>
      </ul>

      <div class="entity-footer">
        <span class="badge badge-${t.status === 'Active' ? 'success' : 'gray'}">${t.status}</span>
        ${isAdmin ? `
          <div>
            <button class="btn btn-sm btn-outline" onclick="openEditTeacherModal(${t.id})">
              <i class="fa-regular fa-pen-to-square"></i> Edit
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteTeacher(${t.id}, '${t.first_name} ${t.last_name}')">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function openAddTeacherModal() {
  document.getElementById('teacher-modal-title').textContent = 'Add Faculty Member';
  document.getElementById('teacher-form').reset();
  document.getElementById('tf-id').value = '';
  openModal('teacher-modal');
}

async function openEditTeacherModal(id) {
  try {
    const res = await apiRequest(`/teachers/${id}`);
    const t = res.teacher;

    document.getElementById('teacher-modal-title').textContent = 'Edit Faculty Member';
    document.getElementById('tf-id').value = t.id;
    document.getElementById('tf-first-name').value = t.first_name || '';
    document.getElementById('tf-last-name').value = t.last_name || '';
    document.getElementById('tf-email').value = t.email || '';
    document.getElementById('tf-phone').value = t.phone || '';
    document.getElementById('tf-dept').value = t.department || 'Computer Science';
    document.getElementById('tf-designation').value = t.designation || '';
    document.getElementById('tf-qualification').value = t.qualification || '';

    openModal('teacher-modal');
  } catch (error) {
    showToast('Failed to retrieve faculty details.', 'danger');
  }
}

async function handleSaveTeacher(e) {
  e.preventDefault();
  const id = document.getElementById('tf-id').value;
  const isEdit = Boolean(id);

  const payload = {
    first_name: document.getElementById('tf-first-name').value,
    last_name: document.getElementById('tf-last-name').value,
    email: document.getElementById('tf-email').value,
    phone: document.getElementById('tf-phone').value,
    department: document.getElementById('tf-dept').value,
    designation: document.getElementById('tf-designation').value,
    qualification: document.getElementById('tf-qualification').value
  };

  try {
    const url = isEdit ? `/teachers/${id}` : '/teachers';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiRequest(url, {
      method,
      body: JSON.stringify(payload)
    });

    showToast(res.message || 'Faculty member saved successfully.', 'success');
    closeModal('teacher-modal');
    loadTeachers();
    loadDashboard();
  } catch (error) {
    showToast(error.message || 'Failed to save faculty member.', 'danger');
  }
}

async function deleteTeacher(id, name) {
  if (!confirm(`Are you sure you want to remove faculty member: ${name}?`)) return;

  try {
    const res = await apiRequest(`/teachers/${id}`, { method: 'DELETE' });
    showToast(res.message || 'Faculty removed.', 'success');
    loadTeachers();
    loadDashboard();
  } catch (error) {
    showToast(error.message || 'Failed to remove faculty member.', 'danger');
  }
}
