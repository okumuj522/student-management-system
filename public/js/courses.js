// Courses & Classes Management Controller

let courseSearchTimeout = null;
let currentViewingCourseId = null;

async function loadCourses() {
  const search = document.getElementById('courses-search') ? document.getElementById('courses-search').value : '';
  const dept = document.getElementById('courses-dept-filter') ? document.getElementById('courses-dept-filter').value : '';

  try {
    const res = await apiRequest(`/courses?search=${encodeURIComponent(search)}&department=${encodeURIComponent(dept)}`);
    renderCoursesGrid(res.data || []);
    populateCourseDropdowns(res.data || []);
  } catch (error) {
    showToast('Failed to load courses.', 'danger');
  }
}

function handleCourseSearch() {
  clearTimeout(courseSearchTimeout);
  courseSearchTimeout = setTimeout(() => {
    loadCourses();
  }, 300);
}

function renderCoursesGrid(courses) {
  const container = document.getElementById('courses-cards-grid');
  if (!container) return;

  if (courses.length === 0) {
    container.innerHTML = '<div class="col-12 text-center" style="padding: 2rem;">No courses found.</div>';
    return;
  }

  const isAdmin = currentUser && currentUser.role === 'admin';

  container.innerHTML = courses.map(c => `
    <div class="entity-card">
      <div class="entity-card-header">
        <div class="entity-icon" style="background: #e0f2fe; color: #0284c7;">
          <i class="fa-solid fa-book"></i>
        </div>
        <div class="entity-title-box">
          <h4>${c.code}</h4>
          <span>${c.department} &bull; ${c.credits} Credits</span>
        </div>
      </div>

      <h5 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">${c.title}</h5>
      <p style="font-size: 0.85rem; color: #64748b; line-height: 1.5; margin-bottom: 1rem;">
        ${c.description || 'Comprehensive curriculum covering theoretical foundations and hands-on applications.'}
      </p>

      <ul class="entity-details-list">
        <li>
          <i class="fa-solid fa-chalkboard-user"></i>
          <strong>Instructor:</strong> 
          ${c.teacher_first_name ? `${c.teacher_first_name} ${c.teacher_last_name}` : '<em class="text-muted">Unassigned</em>'}
        </li>
        <li>
          <i class="fa-solid fa-users"></i>
          <strong>Enrollment:</strong> ${c.enrolled_count} Students
        </li>
        <li>
          <i class="fa-regular fa-calendar"></i>
          <strong>Term:</strong> ${c.semester || 'Spring 2026'}
        </li>
      </ul>

      <div class="entity-footer">
        <button class="btn btn-sm btn-primary" onclick="openCourseStudentsModal(${c.id}, '${c.code} - ${c.title}')">
          <i class="fa-solid fa-users"></i> Roster (${c.enrolled_count})
        </button>
        ${isAdmin ? `
          <div>
            <button class="btn btn-sm btn-outline" onclick="openEditCourseModal(${c.id})">
              <i class="fa-regular fa-pen-to-square"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteCourse(${c.id}, '${c.code}')">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function populateCourseDropdowns(courses) {
  // Update grade course filter & attendance course select
  const attSelect = document.getElementById('attendance-course-select');
  const gradeFilter = document.getElementById('grades-course-filter');
  const gradeModalCourse = document.getElementById('gf-course');

  if (attSelect && courses.length > 0) {
    const currentVal = attSelect.value;
    attSelect.innerHTML = courses.map(c => `<option value="${c.id}">${c.code} - ${c.title}</option>`).join('');
    if (currentVal) attSelect.value = currentVal;
  }

  if (gradeFilter) {
    const currentVal = gradeFilter.value;
    gradeFilter.innerHTML = '<option value="">All Courses</option>' + courses.map(c => `<option value="${c.id}">${c.code} - ${c.title}</option>`).join('');
    if (currentVal) gradeFilter.value = currentVal;
  }

  if (gradeModalCourse) {
    gradeModalCourse.innerHTML = '<option value="">-- Select Course --</option>' + courses.map(c => `<option value="${c.id}">${c.code} - ${c.title}</option>`).join('');
  }
}

async function openAddCourseModal() {
  document.getElementById('course-modal-title').textContent = 'Create New Course';
  document.getElementById('course-form').reset();
  document.getElementById('cf-id').value = '';

  // Populate teacher dropdown
  try {
    const res = await apiRequest('/teachers');
    const teachers = res.data || [];
    const select = document.getElementById('cf-teacher');
    select.innerHTML = '<option value="">-- Select Instructor --</option>' + 
      teachers.map(t => `<option value="${t.id}">${t.first_name} ${t.last_name} (${t.department})</option>`).join('');
  } catch (e) {}

  openModal('course-modal');
}

async function openEditCourseModal(id) {
  try {
    const res = await apiRequest(`/courses/${id}`);
    const c = res.course;

    document.getElementById('course-modal-title').textContent = 'Edit Course Details';
    document.getElementById('cf-id').value = c.id;
    document.getElementById('cf-code').value = c.code || '';
    document.getElementById('cf-title').value = c.title || '';
    document.getElementById('cf-credits').value = c.credits || 3;
    document.getElementById('cf-dept').value = c.department || 'Computer Science';
    document.getElementById('cf-desc').value = c.description || '';

    // Populate teachers
    const teachersRes = await apiRequest('/teachers');
    const teachers = teachersRes.data || [];
    const select = document.getElementById('cf-teacher');
    select.innerHTML = '<option value="">-- Select Instructor --</option>' + 
      teachers.map(t => `<option value="${t.id}" ${t.id === c.teacher_id ? 'selected' : ''}>${t.first_name} ${t.last_name} (${t.department})</option>`).join('');

    openModal('course-modal');
  } catch (error) {
    showToast('Failed to load course details.', 'danger');
  }
}

async function handleSaveCourse(e) {
  e.preventDefault();
  const id = document.getElementById('cf-id').value;
  const isEdit = Boolean(id);

  const payload = {
    code: document.getElementById('cf-code').value,
    title: document.getElementById('cf-title').value,
    credits: document.getElementById('cf-credits').value,
    department: document.getElementById('cf-dept').value,
    teacher_id: document.getElementById('cf-teacher').value || null,
    description: document.getElementById('cf-desc').value
  };

  try {
    const url = isEdit ? `/courses/${id}` : '/courses';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiRequest(url, {
      method,
      body: JSON.stringify(payload)
    });

    showToast(res.message || 'Course saved successfully.', 'success');
    closeModal('course-modal');
    loadCourses();
    loadDashboard();
  } catch (error) {
    showToast(error.message || 'Failed to save course.', 'danger');
  }
}

async function deleteCourse(id, code) {
  if (!confirm(`Are you sure you want to delete course ${code}?`)) return;

  try {
    const res = await apiRequest(`/courses/${id}`, { method: 'DELETE' });
    showToast(res.message || 'Course deleted.', 'success');
    loadCourses();
    loadDashboard();
  } catch (error) {
    showToast(error.message || 'Failed to delete course.', 'danger');
  }
}

async function openCourseStudentsModal(courseId, courseTitle) {
  currentViewingCourseId = courseId;
  document.getElementById('course-students-modal-title').textContent = `Class Roster: ${courseTitle}`;

  // Populate student enroll select with students not already in the course
  try {
    const [courseData, allStudentsData] = await Promise.all([
      apiRequest(`/courses/${courseId}`),
      apiRequest('/students?limit=200')
    ]);

    const enrolled = courseData.students || [];
    const allStudents = allStudentsData.data || [];

    const enrolledIds = new Set(enrolled.map(s => s.id));
    const availableToEnroll = allStudents.filter(s => !enrolledIds.has(s.id));

    const enrollSelect = document.getElementById('enroll-student-select');
    enrollSelect.innerHTML = '<option value="">-- Choose Student to Enroll --</option>' +
      availableToEnroll.map(s => `<option value="${s.id}">${s.student_id_code} - ${s.first_name} ${s.last_name}</option>`).join('');

    renderCourseStudentsTable(enrolled);
    openModal('course-students-modal');
  } catch (error) {
    showToast('Failed to load course roster.', 'danger');
  }
}

function renderCourseStudentsTable(students) {
  const tbody = document.getElementById('course-students-tbody');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 2rem;">No students enrolled yet.</td></tr>';
    return;
  }

  const isAdmin = currentUser && currentUser.role === 'admin';

  tbody.innerHTML = students.map(s => `
    <tr>
      <td><span class="badge badge-primary">${s.student_id_code}</span></td>
      <td><strong>${s.first_name} ${s.last_name}</strong></td>
      <td>${s.email}</td>
      <td>${s.enrollment_date}</td>
      <td><span class="badge badge-${s.grade_letter && s.grade_letter !== 'F' ? 'success' : 'gray'}">${s.grade_letter || 'Ungraded'}</span></td>
      <td class="text-right admin-only">
        ${isAdmin ? `
          <button class="btn btn-sm btn-outline-danger" title="Drop from course" onclick="handleUnenrollStudent(${s.id})">
            <i class="fa-solid fa-user-minus"></i> Drop
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');
}

async function handleEnrollStudentInCourse() {
  const studentId = document.getElementById('enroll-student-select').value;
  if (!studentId || !currentViewingCourseId) {
    showToast('Please select a student to enroll.', 'warning');
    return;
  }

  try {
    const res = await apiRequest('/courses/enroll', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        course_id: currentViewingCourseId
      })
    });

    showToast(res.message || 'Student enrolled.', 'success');
    openCourseStudentsModal(currentViewingCourseId, document.getElementById('course-students-modal-title').textContent.replace('Class Roster: ', ''));
    loadCourses();
  } catch (error) {
    showToast(error.message || 'Enrollment failed.', 'danger');
  }
}

async function handleUnenrollStudent(studentId) {
  if (!confirm('Are you sure you want to drop this student from the course?')) return;

  try {
    const res = await apiRequest('/courses/unenroll', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        course_id: currentViewingCourseId
      })
    });

    showToast(res.message || 'Student removed from course roster.', 'success');
    openCourseStudentsModal(currentViewingCourseId, document.getElementById('course-students-modal-title').textContent.replace('Class Roster: ', ''));
    loadCourses();
  } catch (error) {
    showToast(error.message || 'Failed to remove student.', 'danger');
  }
}
