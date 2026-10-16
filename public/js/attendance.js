// Attendance Roll Call & Register Controller

let currentClassSheet = [];

async function initAttendancePage() {
  const dateInput = document.getElementById('attendance-date-select');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // Load class attendance sheet for current selected course
  const courseSelect = document.getElementById('attendance-course-select');
  if (courseSelect && courseSelect.value) {
    loadClassAttendanceSheet();
  }
}

async function loadClassAttendanceSheet() {
  const courseId = document.getElementById('attendance-course-select').value;
  const date = document.getElementById('attendance-date-select').value;

  if (!courseId) return;

  try {
    const res = await apiRequest(`/attendance/sheet?course_id=${courseId}&date=${date}`);
    currentClassSheet = res.sheet || [];
    renderAttendanceSheet(currentClassSheet);
  } catch (error) {
    showToast('Failed to load class attendance sheet.', 'danger');
  }
}

function renderAttendanceSheet(students) {
  const tbody = document.getElementById('attendance-sheet-tbody');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 2rem;">No students enrolled in this course yet.</td></tr>';
    return;
  }

  tbody.innerHTML = students.map((s, idx) => `
    <tr>
      <td><span class="badge badge-primary">${s.student_id_code}</span></td>
      <td><strong>${s.first_name} ${s.last_name}</strong></td>
      <td>${s.email}</td>
      <td>
        <div class="attendance-status-btn-group" id="status-group-${s.student_id}">
          <button type="button" class="status-choice-btn ${s.status === 'Present' ? 'selected-Present' : ''}" onclick="setStudentAttendanceStatus(${idx}, 'Present')">Present</button>
          <button type="button" class="status-choice-btn ${s.status === 'Absent' ? 'selected-Absent' : ''}" onclick="setStudentAttendanceStatus(${idx}, 'Absent')">Absent</button>
          <button type="button" class="status-choice-btn ${s.status === 'Late' ? 'selected-Late' : ''}" onclick="setStudentAttendanceStatus(${idx}, 'Late')">Late</button>
          <button type="button" class="status-choice-btn ${s.status === 'Excused' ? 'selected-Excused' : ''}" onclick="setStudentAttendanceStatus(${idx}, 'Excused')">Excused</button>
        </div>
      </td>
      <td>
        <input type="text" class="form-control form-control-sm" style="max-width: 250px;" 
          placeholder="Remarks (optional)" 
          value="${s.remarks || ''}" 
          onchange="updateStudentAttendanceRemarks(${idx}, this.value)">
      </td>
    </tr>
  `).join('');
}

function setStudentAttendanceStatus(index, status) {
  if (currentClassSheet[index]) {
    currentClassSheet[index].status = status;
    renderAttendanceSheet(currentClassSheet);
  }
}

function updateStudentAttendanceRemarks(index, remarks) {
  if (currentClassSheet[index]) {
    currentClassSheet[index].remarks = remarks;
  }
}

function markAllAttendance(status) {
  currentClassSheet.forEach(s => {
    s.status = status;
  });
  renderAttendanceSheet(currentClassSheet);
  showToast(`Marked all ${currentClassSheet.length} students as ${status}.`, 'primary');
}

async function submitAttendanceBatch() {
  const courseId = document.getElementById('attendance-course-select').value;
  const date = document.getElementById('attendance-date-select').value;

  if (!courseId || !date) {
    showToast('Course and date must be specified.', 'warning');
    return;
  }

  if (currentClassSheet.length === 0) {
    showToast('No students enrolled to record attendance.', 'warning');
    return;
  }

  const saveBtn = document.getElementById('save-attendance-btn');
  const originalText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

  const records = currentClassSheet.map(s => ({
    student_id: s.student_id,
    status: s.status,
    remarks: s.remarks || null
  }));

  try {
    const res = await apiRequest('/attendance/batch', {
      method: 'POST',
      body: JSON.stringify({
        course_id: courseId,
        date,
        records
      })
    });

    showToast(res.message || 'Attendance records saved successfully.', 'success');
    loadDashboard();
  } catch (error) {
    showToast(error.message || 'Failed to record attendance.', 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
  }
}
