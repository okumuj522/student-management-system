// Announcements & Notice Board Controller

async function loadAnnouncements() {
  try {
    const res = await apiRequest('/announcements');
    renderAnnouncementsList(res.data || []);
  } catch (error) {
    showToast('Failed to load notices.', 'danger');
  }
}

function renderAnnouncementsList(list) {
  const container = document.getElementById('announcements-full-grid');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = '<div class="col-12 text-center" style="padding: 2rem;">No campus notices at this time.</div>';
    return;
  }

  const isAdmin = currentUser && currentUser.role === 'admin';

  container.innerHTML = list.map(a => {
    let catClass = 'badge-primary';
    if (a.category === 'Exam') catClass = 'badge-danger';
    if (a.category === 'Holiday') catClass = 'badge-warning';
    if (a.category === 'Event') catClass = 'badge-success';

    return `
      <div class="notice-card">
        <div>
          <div class="notice-header">
            <span class="badge ${catClass}">${a.category}</span>
            ${isAdmin ? `
              <button class="btn btn-sm btn-link" style="color: #ef4444;" title="Delete Notice" onclick="deleteAnnouncement(${a.id})">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            ` : ''}
          </div>
          <h4 class="notice-title">${a.title}</h4>
          <p class="notice-body">${a.content}</p>
        </div>

        <div class="notice-footer">
          <span><i class="fa-solid fa-user-pen"></i> ${a.author_name} (${a.author_role})</span>
          <span><i class="fa-regular fa-calendar"></i> ${new Date(a.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    `;
  }).join('');
}

function openCreateAnnouncementModal() {
  document.getElementById('announcement-form').reset();
  openModal('announcement-modal');
}

async function handleSaveAnnouncement(e) {
  e.preventDefault();

  const payload = {
    title: document.getElementById('af-title').value,
    category: document.getElementById('af-category').value,
    content: document.getElementById('af-content').value
  };

  try {
    const res = await apiRequest('/announcements', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    showToast(res.message || 'Notice published.', 'success');
    closeModal('announcement-modal');
    loadAnnouncements();
    loadDashboard();
  } catch (error) {
    showToast(error.message || 'Failed to post announcement.', 'danger');
  }
}

async function deleteAnnouncement(id) {
  if (!confirm('Remove this announcement from the campus notice board?')) return;

  try {
    const res = await apiRequest(`/announcements/${id}`, { method: 'DELETE' });
    showToast(res.message || 'Announcement deleted.', 'success');
    loadAnnouncements();
    loadDashboard();
  } catch (error) {
    showToast(error.message || 'Failed to delete announcement.', 'danger');
  }
}
