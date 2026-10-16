// Grades, Academic Performance & Official Transcript Controller

let gradesSearchTimeout = null;

async function loadGrades() {
  const courseId = document.getElementById('grades-course-filter') ? document.getElementById('grades-course-filter').value : '';

  try {
    const url = courseId ? `/grades?course_id=${courseId}` : '/grades';
    const res = await apiRequest(url);
    renderGradesTable(res.data || []);
  } catch (error) {
    showToast('Failed to load grades.', 'danger');
  }
}

function handleGradesSearch() {
  clearTimeout(gradesSearchTimeout);
  gradesSearchTimeout = setTimeout(() => {
    const term = document.getElementById('grades-search').value.toLowerCase();
    const rows = document.querySelectorAll('#grades-table-body tr');
    rows.forEach(r => {
      const text = r.textContent.toLowerCase();
      r.style.display = text.includes(term) ? '' : 'none';
    });
  }, 250);
}

function renderGradesTable(grades) {
  const tbody = document.getElementById('grades-table-body');
  if (!tbody) return;

  if (grades.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding: 2rem;">No grade records found.</td></tr>';
    return;
  }

  tbody.innerHTML = grades.map(g => {
    let letterBadge = 'success';
    if (g.grade_letter === 'C') letterBadge = 'warning';
    if (g.grade_letter === 'D' || g.grade_letter === 'F') letterBadge = 'danger';

    return `
      <tr>
        <td>
          <strong>${g.first_name} ${g.last_name}</strong>
          <br><small class="text-muted">${g.student_id_code}</small>
        </td>
        <td>
          <strong>${g.course_code}</strong>
          <br><small class="text-muted">${g.course_title}</small>
        </td>
        <td>${g.assignment_score} / 100</td>
        <td>${g.midterm_score} / 100</td>
        <td>${g.final_score} / 100</td>
        <td><strong>${g.total_score}%</strong></td>
        <td><span class="badge badge-${letterBadge}">${g.grade_letter}</span></td>
        <td>${g.remarks || '—'}</td>
        <td class="text-right">
          <button class="btn btn-sm btn-outline" title="Print Transcript" onclick="viewTranscript(${g.student_id})">
            <i class="fa-solid fa-print"></i> Transcript
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function openGradeModal() {
  document.getElementById('grade-form').reset();

  // Populate courses
  try {
    const res = await apiRequest('/courses');
    const courses = res.data || [];
    const select = document.getElementById('gf-course');
    select.innerHTML = '<option value="">-- Select Course --</option>' + 
      courses.map(c => `<option value="${c.id}">${c.code} - ${c.title}</option>`).join('');

    document.getElementById('gf-student').innerHTML = '<option value="">-- Select Student --</option>';
    openModal('grade-modal');
  } catch (e) {
    showToast('Failed to prepare grade entry modal.', 'danger');
  }
}

async function populateStudentsForCourse(courseId) {
  const studentSelect = document.getElementById('gf-student');
  if (!courseId) {
    studentSelect.innerHTML = '<option value="">-- Select Student --</option>';
    return;
  }

  try {
    const res = await apiRequest(`/courses/${courseId}`);
    const students = res.students || [];

    if (students.length === 0) {
      studentSelect.innerHTML = '<option value="">No enrolled students in this course</option>';
      return;
    }

    studentSelect.innerHTML = '<option value="">-- Select Student --</option>' +
      students.map(s => `<option value="${s.id}">${s.student_id_code} - ${s.first_name} ${s.last_name}</option>`).join('');
  } catch (e) {
    showToast('Failed to load students for selected course.', 'danger');
  }
}

async function handleSaveGrade(e) {
  e.preventDefault();

  const payload = {
    course_id: document.getElementById('gf-course').value,
    student_id: document.getElementById('gf-student').value,
    assignment_score: document.getElementById('gf-assign').value,
    midterm_score: document.getElementById('gf-mid').value,
    final_score: document.getElementById('gf-final').value,
    remarks: document.getElementById('gf-remarks').value
  };

  try {
    const res = await apiRequest('/grades', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    showToast(res.message || 'Grade recorded.', 'success');
    closeModal('grade-modal');
    loadGrades();
    loadDashboard();
  } catch (error) {
    showToast(error.message || 'Failed to save grade.', 'danger');
  }
}

async function viewTranscript(studentId) {
  try {
    const res = await apiRequest(`/grades/transcript/${studentId}`);
    const s = res.student;
    const courses = res.courses || [];
    const gpa = res.gpa;
    const totalCredits = res.totalCredits;

    const content = document.getElementById('transcript-content');
    content.innerHTML = `
      <div class="transcript-header">
        <div style="font-size: 2.2rem; color: #4f46e5; margin-bottom: 0.25rem;">
          <i class="fa-solid fa-graduation-cap"></i>
        </div>
        <h2>EduPulse Institute of Technology</h2>
        <p style="color: #64748b; font-size: 0.9rem;">Official Academic Record & Transcript of Records</p>
      </div>

      <div class="transcript-meta-grid">
        <div><strong>Student Name:</strong> ${s.first_name} ${s.last_name}</div>
        <div><strong>Student ID Code:</strong> ${s.student_id_code}</div>
        <div><strong>Department:</strong> ${s.department}</div>
        <div><strong>Enrollment Date:</strong> ${s.enrollment_date}</div>
        <div><strong>Date of Birth:</strong> ${s.dob || 'N/A'}</div>
        <div><strong>Status:</strong> ${s.status}</div>
      </div>

      <div class="table-responsive">
        <table class="table" style="border: 1px solid #e2e8f0;">
          <thead>
            <tr style="background: #f1f5f9;">
              <th>Course Code</th>
              <th>Course Title</th>
              <th>Credits</th>
              <th>Assignment</th>
              <th>Midterm</th>
              <th>Final</th>
              <th>Total %</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            ${courses.length === 0 ? '<tr><td colspan="8" class="text-center">No enrolled courses.</td></tr>' :
              courses.map(c => `
                <tr>
                  <td><strong>${c.code}</strong></td>
                  <td>${c.title}</td>
                  <td>${c.credits}</td>
                  <td>${c.assignment_score}</td>
                  <td>${c.midterm_score}</td>
                  <td>${c.final_score}</td>
                  <td><strong>${c.total_score}%</strong></td>
                  <td><span class="badge badge-${c.grade_letter !== 'F' && c.grade_letter !== 'N/A' ? 'success' : 'danger'}">${c.grade_letter}</span></td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>

      <div class="transcript-gpa-badge">
        <h4 style="font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: #4338ca; margin-bottom: 0.25rem;">Cumulative Grade Point Average (GPA)</h4>
        <h3>${gpa} / 4.00</h3>
        <p style="font-size: 0.8rem; color: #475569; margin-top: 0.25rem;">Total Graded Credits Earned: ${totalCredits} Credit Hours</p>
      </div>

      <div style="margin-top: 2rem; display: flex; justify-content: space-between; padding-top: 2rem; border-top: 1px dashed #cbd5e1; font-size: 0.85rem; color: #64748b;">
        <div>
          <div style="border-bottom: 1px solid #94a3b8; width: 180px; height: 35px; margin-bottom: 0.35rem;"></div>
          <span>Office of the Registrar</span>
        </div>
        <div style="text-align: right;">
          <p>Issued on: ${res.generatedDate}</p>
          <span style="color: #10b981; font-weight: 700;"><i class="fa-solid fa-stamp"></i> Official Digital Seal</span>
        </div>
      </div>
    `;

    openModal('transcript-modal');
  } catch (error) {
    showToast('Failed to generate academic transcript.', 'danger');
  }
}
