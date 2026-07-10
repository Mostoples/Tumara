/* ============================================================
   TUMARA — Panel Admin
   Kelola akun: buat akun guru/siswa, ubah peran, hapus.
   Dipakai di admin.html (di luar App router siswa).
   ============================================================ */

const AdminView = {
  query: '',
  filter: 'all', // 'all' | 'admin' | 'guru' | 'siswa'
  _el: null,

  async render(el) {
    this._el = el;
    el.innerHTML = `<div class="portal-loading"><div class="spinner"></div> ${tr('Memuat data akun…', 'Loading accounts…')}</div>`;

    let users = [];
    try {
      users = await DB.adminListUsers();
    } catch (e) {
      el.innerHTML = `<div class="card empty-state">
        <ion-icon name="alert-circle-outline"></ion-icon>
        <div class="es-title">${tr('Gagal memuat data akun', 'Failed to load accounts')}</div>
        <div class="es-sub">${esc(e.message || '')}</div>
      </div>`;
      return;
    }

    const counts = { admin: 0, guru: 0, siswa: 0 };
    users.forEach(u => { counts[u.role || 'siswa'] = (counts[u.role || 'siswa'] || 0) + 1; });

    const q = this.query.toLowerCase();
    let shown = users.filter(u => {
      if (this.filter !== 'all' && (u.role || 'siswa') !== this.filter) return false;
      if (!q) return true;
      return (u.nama || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
        || (u.kelas || '').toLowerCase().includes(q) || (u.mapel || '').toLowerCase().includes(q);
    });
    shown.sort((a, b) => {
      const order = { admin: 0, guru: 1, siswa: 2 };
      const r = (order[a.role] ?? 3) - (order[b.role] ?? 3);
      return r !== 0 ? r : (a.nama || '').localeCompare(b.nama || '');
    });

    const roleBadge = r => {
      const map = { admin: 'badge-purple', guru: 'badge-green', siswa: 'badge-blue' };
      return `<span class="badge ${map[r] || 'badge-gray'}">${roleLabel(r)}</span>`;
    };

    el.innerHTML = `
      <div class="portal-head">
        <div>
          <h1>${tr('Kelola Akun', 'Manage Accounts')}</h1>
          <p>${tr('Buat & atur akun guru dan siswa sekolahmu.', 'Create & manage teacher and student accounts.')}</p>
        </div>
        <button class="btn btn-primary" id="addUser"><ion-icon name="person-add-outline"></ion-icon> ${tr('Buat Akun', 'Create Account')}</button>
      </div>

      <div class="grid grid-4 stat-grid">
        <div class="card stat-mini"><div class="sm-num">${users.length}</div><div class="sm-label">${tr('Total Akun', 'Total Accounts')}</div></div>
        <div class="card stat-mini"><div class="sm-num" style="color:var(--prod)">${counts.admin || 0}</div><div class="sm-label">Admin</div></div>
        <div class="card stat-mini"><div class="sm-num" style="color:var(--brand)">${counts.guru || 0}</div><div class="sm-label">${tr('Guru', 'Teachers')}</div></div>
        <div class="card stat-mini"><div class="sm-num" style="color:var(--info)">${counts.siswa || 0}</div><div class="sm-label">${tr('Siswa', 'Students')}</div></div>
      </div>

      <div style="display:flex;gap:10px;margin:20px 0 16px;flex-wrap:wrap;align-items:center;">
        <div class="input-group" style="flex:1;min-width:220px;">
          <input type="text" class="input" id="uSearch" placeholder="${tr('Cari nama, email, kelas…', 'Search name, email, class…')}" value="${esc(this.query)}">
          <button class="suffix-btn"><ion-icon name="search-outline"></ion-icon></button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${['all', 'guru', 'siswa', 'admin'].map(f => `<button class="chip ${this.filter === f ? 'active' : ''}" data-filter="${f}">${f === 'all' ? tr('Semua', 'All') : roleLabel(f)}</button>`).join('')}
        </div>
      </div>

      ${shown.length ? `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>${tr('Nama', 'Name')}</th><th>Email</th><th>${tr('Peran', 'Role')}</th>
              <th>${tr('Detail', 'Detail')}</th><th style="text-align:right;">${tr('Aksi', 'Actions')}</th>
            </tr></thead>
            <tbody>
              ${shown.map(u => `
                <tr>
                  <td><div style="display:flex;align-items:center;gap:10px;">
                    <span class="avatar avatar-sm">${esc((u.nama || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>
                    <b>${esc(u.nama || '-')}</b>
                  </div></td>
                  <td style="color:var(--text-3);">${esc(u.email || '-')}</td>
                  <td>${roleBadge(u.role || 'siswa')}</td>
                  <td style="color:var(--text-3);font-size:.82rem;">${esc(u.mapel || u.kelas || u.sekolah || '-')}</td>
                  <td style="text-align:right;white-space:nowrap;">
                    <button class="mini-icon-btn" data-edit="${u.id}" title="${tr('Ubah', 'Edit')}"><ion-icon name="create-outline"></ion-icon></button>
                    <button class="mini-icon-btn danger" data-del="${u.id}" title="${tr('Hapus', 'Delete')}" ${u.id === DB.user.id ? 'disabled' : ''}><ion-icon name="trash-outline"></ion-icon></button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `
        <div class="card empty-state">
          <ion-icon name="people-outline"></ion-icon>
          <div class="es-title">${tr('Tidak ada akun yang cocok', 'No matching accounts')}</div>
          <div class="es-sub">${this.query || this.filter !== 'all' ? tr('Coba ubah pencarian/filter', 'Try changing the search/filter') : tr('Buat akun pertama dengan tombol di atas', 'Create the first account with the button above')}</div>
        </div>`}`;

    let deb;
    $('#uSearch', el).oninput = e => { clearTimeout(deb); deb = setTimeout(() => { this.query = e.target.value; this.render(el); }, 250); };
    $$('[data-filter]', el).forEach(b => b.onclick = () => { this.filter = b.dataset.filter; this.render(el); });
    $('#addUser', el).onclick = () => this._userModal();
    $$('[data-edit]', el).forEach(b => b.onclick = () => this._userModal(users.find(u => u.id === b.dataset.edit)));
    $$('[data-del]', el).forEach(b => b.onclick = async () => {
      const u = users.find(x => x.id === b.dataset.del);
      if (!await confirmDialog(
        tr(`Hapus akun "${u.nama}" (${u.email})? Data profilnya akan dihapus. Tindakan ini tidak bisa dibatalkan.`,
           `Delete account "${u.nama}" (${u.email})? Their profile data will be removed. This cannot be undone.`),
        { danger: true, okText: tr('Hapus Akun', 'Delete Account') })) return;
      try {
        await DB.adminDeleteUser(u.id);
        toast(tr('Akun dihapus.', 'Account deleted.'));
        this.render(el);
      } catch (e) { toast(e.message, 'error'); }
    });
  },

  _userModal(user = null) {
    const editing = !!user;
    let role = user?.role || 'guru';

    const extraFields = r => r === 'guru' ? `
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field"><label>${tr('Mata pelajaran', 'Subject')}</label><input type="text" class="input" id="mMapel" placeholder="${tr('mis. Matematika', 'e.g. Math')}" value="${esc(user?.mapel || '')}"></div>
          <div class="field"><label>NIP/NIK <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="text" class="input" id="mNip" value="${esc(user?.nip || '')}"></div>
        </div>
        <div class="field"><label>${tr('Asal sekolah', 'School')} <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="text" class="input" id="mSekolah" value="${esc(user?.sekolah || '')}"></div>`
      : r === 'siswa' ? `
        <div class="grid grid-2 keep-2" style="gap:12px;">
          <div class="field"><label>${tr('Kelas', 'Class')}</label><input type="text" class="input" id="mKelas" placeholder="${tr('mis. X TKJ 2', 'e.g. X TKJ 2')}" value="${esc(user?.kelas || '')}"></div>
          <div class="field"><label>NIS <span style="font-weight:500;color:var(--text-3)">${tr('(opsional)', '(optional)')}</span></label><input type="text" class="input" id="mNis" value="${esc(user?.nis || '')}"></div>
        </div>`
      : '';

    openModal({
      title: editing ? tr('Ubah Akun', 'Edit Account') : tr('Buat Akun Baru', 'Create New Account'),
      body: `
        <div class="field">
          <label>${tr('Peran', 'Role')}</label>
          <div class="radio-cards" id="mRole">
            <div class="radio-card ${role === 'guru' ? 'selected' : ''}" data-val="guru"><ion-icon name="school-outline"></ion-icon>${tr('Guru', 'Teacher')}</div>
            <div class="radio-card ${role === 'siswa' ? 'selected' : ''}" data-val="siswa"><ion-icon name="person-outline"></ion-icon>${tr('Siswa', 'Student')}</div>
            <div class="radio-card ${role === 'admin' ? 'selected' : ''}" data-val="admin"><ion-icon name="shield-checkmark-outline"></ion-icon>Admin</div>
          </div>
        </div>
        <div class="field">
          <label>${tr('Nama lengkap', 'Full name')}</label>
          <input type="text" class="input" id="mNama" placeholder="${tr('Nama guru / siswa', 'Teacher / student name')}" value="${esc(user?.nama || '')}">
        </div>
        <div class="field">
          <label>Email ${editing ? `<span style="font-weight:500;color:var(--text-3)">${tr('(tidak bisa diubah)', '(cannot be changed)')}</span>` : ''}</label>
          <input type="email" class="input" id="mEmail" placeholder="nama@sekolah.id" value="${esc(user?.email || '')}" ${editing ? 'disabled' : ''}>
        </div>
        ${editing ? '' : `
        <div class="field">
          <label>${tr('Kata sandi awal', 'Initial password')}</label>
          <div class="input-group">
            <input type="text" class="input" id="mPass" placeholder="${tr('Minimal 6 karakter', 'At least 6 characters')}">
            <button type="button" class="suffix-btn" id="genPass" title="${tr('Buat otomatis', 'Auto-generate')}"><ion-icon name="refresh"></ion-icon></button>
          </div>
        </div>`}
        <div id="mExtra">${extraFields(role)}</div>
        <button class="btn btn-primary btn-block" id="mSave"><ion-icon name="checkmark"></ion-icon> ${editing ? tr('Simpan Perubahan', 'Save Changes') : tr('Buat Akun', 'Create Account')}</button>`,
      onMount: m => {
        $$('#mRole .radio-card', m).forEach(c => c.onclick = () => {
          role = c.dataset.val;
          $$('#mRole .radio-card', m).forEach(x => x.classList.toggle('selected', x === c));
          $('#mExtra', m).innerHTML = extraFields(role);
        });
        const gen = $('#genPass', m);
        if (gen) gen.onclick = () => {
          $('#mPass', m).value = 'tumara' + Math.floor(1000 + Math.random() * 9000);
        };
        $('#mSave', m).onclick = async () => {
          const nama = $('#mNama', m).value.trim();
          if (nama.length < 2) return toast(tr('Isi nama lengkap.', 'Enter a full name.'), 'warning');

          const extra = {};
          if (role === 'guru') { extra.mapel = $('#mMapel', m)?.value.trim() || ''; extra.nip = $('#mNip', m)?.value.trim() || ''; extra.sekolah = $('#mSekolah', m)?.value.trim() || ''; }
          else if (role === 'siswa') { extra.kelas = $('#mKelas', m)?.value.trim() || ''; extra.nis = $('#mNis', m)?.value.trim() || ''; }

          const btn = $('#mSave', m); btn.disabled = true;
          try {
            if (editing) {
              await DB.adminUpdateUser(user.id, { nama, role, ...extra });
              toast(tr('Akun diperbarui.', 'Account updated.'));
            } else {
              const email = $('#mEmail', m).value.trim();
              const pass = $('#mPass', m).value;
              if (!/^\S+@\S+\.\S+$/.test(email)) { btn.disabled = false; return toast(tr('Email tidak valid.', 'Invalid email.'), 'warning'); }
              if (pass.length < 6) { btn.disabled = false; return toast(tr('Kata sandi minimal 6 karakter.', 'Password must be at least 6 characters.'), 'warning'); }
              await DB.adminCreateUser({ nama, email, password: pass, role, extra });
              closeModal();
              this._createdInfoModal(nama, email, pass, role);
              this.render(this._el);
              return;
            }
            closeModal();
            this.render(this._el);
          } catch (e) {
            btn.disabled = false;
            toast(e.message, 'error');
          }
        };
      }
    });
  },

  // Tampilkan kredensial akun yang baru dibuat agar admin bisa menyerahkannya.
  _createdInfoModal(nama, email, pass, role) {
    openModal({
      title: tr('Akun Berhasil Dibuat ✅', 'Account Created ✅'),
      body: `
        <p style="font-size:.86rem;color:var(--text-2);line-height:1.6;margin-bottom:14px;">
          ${tr(`Akun ${roleLabel(role).toLowerCase()} untuk <b>${esc(nama)}</b> sudah dibuat. Berikan kredensial berikut kepada yang bersangkutan:`, `The ${roleLabel(role).toLowerCase()} account for <b>${esc(nama)}</b> is created. Share these credentials with them:`)}
        </p>
        <div class="cred-box">
          <div><span>Email</span><b id="cEmail">${esc(email)}</b></div>
          <div><span>${tr('Kata sandi', 'Password')}</span><b id="cPass">${esc(pass)}</b></div>
        </div>
        <p style="font-size:.78rem;color:var(--text-3);margin:12px 0 16px;">${tr('Sarankan mereka mengganti kata sandi setelah login pertama (menu Profil).', 'Advise them to change the password after first login (Profile menu).')}</p>
        <button class="btn btn-primary btn-block" id="cCopy"><ion-icon name="copy-outline"></ion-icon> ${tr('Salin Kredensial', 'Copy Credentials')}</button>`,
      onMount: m => {
        $('#cCopy', m).onclick = async () => {
          const text = `Tumara\nEmail: ${email}\n${tr('Kata sandi', 'Password')}: ${pass}`;
          try { await navigator.clipboard.writeText(text); toast(tr('Kredensial disalin 📋', 'Credentials copied 📋')); }
          catch (_) { toast(tr('Tidak bisa menyalin otomatis — catat manual ya.', 'Could not auto-copy — please note it manually.'), 'warning'); }
        };
      }
    });
  }
};
