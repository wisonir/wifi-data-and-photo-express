/**
 * Application Frontend Controller (WiFi QR Share & Transfer)
 */
const Notify = {
  toast({ title, icon = 'success', duration = 3000 }) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toastEl = document.createElement('div');
    toastEl.className = 'pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl flex items-center space-x-3 text-slate-100 animate-toast-in';

    let iconMarkup = '<i class="fa-solid fa-circle-check text-emerald-400 text-lg"></i>';
    if (icon === 'error') iconMarkup = '<i class="fa-solid fa-circle-xmark text-rose-400 text-lg"></i>';
    if (icon === 'warning') iconMarkup = '<i class="fa-solid fa-triangle-exclamation text-amber-400 text-lg"></i>';
    if (icon === 'info') iconMarkup = '<i class="fa-solid fa-circle-info text-cyan-400 text-lg"></i>';

    toastEl.innerHTML = `
      <div class="shrink-0">${iconMarkup}</div>
      <div class="flex-1 text-xs font-semibold leading-tight text-slate-200">${title}</div>
      <button onclick="this.parentElement.remove()" class="text-slate-500 hover:text-slate-300 text-xs ml-2"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toastEl);
    setTimeout(() => {
      toastEl.classList.remove('animate-toast-in');
      toastEl.classList.add('animate-toast-out');
      setTimeout(() => toastEl.remove(), 250);
    }, duration);
  },

  fire(titleOrOptions, textMsg, iconType) {
    return new Promise((resolve) => {
      let opts = typeof titleOrOptions === 'object' ? titleOrOptions : { title: titleOrOptions, text: textMsg, icon: iconType || 'info' };

      if (opts.toast) {
        this.toast({ title: opts.title || opts.text, icon: opts.icon || 'success', duration: opts.timer || 2500 });
        resolve({ isConfirmed: true });
        return;
      }

      const backdrop = document.getElementById('custom-dialog-backdrop');
      const titleEl = document.getElementById('dialog-title');
      const textEl = document.getElementById('dialog-text');
      const iconBg = document.getElementById('dialog-icon-bg');
      const iconSymbol = document.getElementById('dialog-icon-symbol');
      const inputWrapper = document.getElementById('dialog-input-wrapper');
      const inputLabel = document.getElementById('dialog-input-label');
      const inputEl = document.getElementById('dialog-input-element');
      const loadingSpinner = document.getElementById('dialog-loading-spinner');
      const btnCancel = document.getElementById('dialog-btn-cancel');
      const btnConfirm = document.getElementById('dialog-btn-confirm');
      const actionsWrapper = document.getElementById('dialog-actions-wrapper');

      titleEl.textContent = opts.title || '';
      textEl.textContent = opts.text || '';
      textEl.style.display = opts.text ? 'block' : 'none';

      const icon = opts.icon || 'info';
      if (icon === 'success') {
        iconBg.className = 'w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-2xl shadow-lg';
        iconSymbol.className = 'fa-solid fa-circle-check';
      } else if (icon === 'error') {
        iconBg.className = 'w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center text-2xl shadow-lg';
        iconSymbol.className = 'fa-solid fa-circle-xmark';
      } else if (icon === 'warning') {
        iconBg.className = 'w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl shadow-lg';
        iconSymbol.className = 'fa-solid fa-triangle-exclamation';
      } else if (icon === 'question') {
        iconBg.className = 'w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-2xl shadow-lg';
        iconSymbol.className = 'fa-solid fa-circle-question';
      } else {
        iconBg.className = 'w-14 h-14 rounded-2xl bg-brand-500/20 border border-brand-500/30 text-brand-400 flex items-center justify-center text-2xl shadow-lg';
        iconSymbol.className = 'fa-solid fa-circle-info';
      }

      if (opts.input === 'text' || opts.input === 'password') {
        inputWrapper.classList.remove('hidden');
        inputLabel.textContent = opts.inputLabel || '';
        inputEl.type = opts.input || 'text';
        inputEl.value = '';
        inputEl.placeholder = opts.inputPlaceholder || '';
      } else {
        inputWrapper.classList.add('hidden');
      }

      if (opts.didOpen || opts.showLoading) {
        loadingSpinner.classList.remove('hidden');
        actionsWrapper.classList.add('hidden');
        if (opts.didOpen) opts.didOpen();
      } else {
        loadingSpinner.classList.add('hidden');
        actionsWrapper.classList.remove('hidden');
      }

      if (opts.showCancelButton) {
        btnCancel.classList.remove('hidden');
        btnCancel.textContent = opts.cancelButtonText || 'Batal';
      } else {
        btnCancel.classList.add('hidden');
      }
      btnConfirm.textContent = opts.confirmButtonText || 'OK';

      backdrop.classList.remove('hidden');

      const cleanup = () => {
        backdrop.classList.add('hidden');
        btnConfirm.onclick = null;
        btnCancel.onclick = null;
      };

      btnConfirm.onclick = () => {
        const val = inputEl.value;
        cleanup();
        resolve({ isConfirmed: true, value: val });
      };

      btnCancel.onclick = () => {
        cleanup();
        resolve({ isConfirmed: false, isDismissed: true });
      };
    });
  },

  close() {
    const backdrop = document.getElementById('custom-dialog-backdrop');
    if (backdrop) backdrop.classList.add('hidden');
  },

  showLoading() {
    const loadingSpinner = document.getElementById('dialog-loading-spinner');
    const actionsWrapper = document.getElementById('dialog-actions-wrapper');
    if (loadingSpinner) loadingSpinner.classList.remove('hidden');
    if (actionsWrapper) actionsWrapper.classList.add('hidden');
  }
};

window.Swal = Notify;

// STATE VARIABLES
let currentUser = JSON.parse(localStorage.getItem('wifi_qr_user')) || { username: 'Tamu', role: 'Guest' };
let currentRoomCode = localStorage.getItem('wifi_qr_active_room') || null;
let selectedFiles = []; 
let html5QrScannerInstance = null;
let rawHistoryLogs = [];
let currentActiveFiles = [];
let currentPreviewData = null;
let localGuestUploads = []; 
let liveCountdownInterval = null;
let adminRawUsers = [];

let currentZoomScale = 1;
let currentRotation = 0;
let currentPanX = 0;
let currentPanY = 0;
let isPanning = false;
let startPanX = 0;
let startPanY = 0;

document.addEventListener('DOMContentLoaded', () => {
  updateUserUI();
  if (currentRoomCode) {
    setRoomActive(currentRoomCode);
  }
  setupDragAndDrop();
  setupImagePanEvents();
  startLiveCountdownTimer();
  registerServiceWorker();
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    const swBlob = new Blob([`
      self.addEventListener('install', (e) => self.skipWaiting());
      self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
      self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))));
    `], { type: 'text/javascript' });
    
    const swUrl = URL.createObjectURL(swBlob);
    navigator.serviceWorker.register(swUrl).catch(err => console.log('SW Registration optional:', err));
  }
}

function switchUploadTab(type) {
  const btnFile = document.getElementById('upload-tab-btn-file');
  const btnText = document.getElementById('upload-tab-btn-text');
  const contentFile = document.getElementById('upload-content-file');
  const contentText = document.getElementById('upload-content-text');

  if (type === 'file') {
    btnFile.className = 'flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 bg-brand-600 text-white shadow-md';
    btnText.className = 'flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60';
    contentFile.classList.remove('hidden');
    contentText.classList.add('hidden');
  } else {
    btnText.className = 'flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 bg-brand-600 text-white shadow-md';
    btnFile.className = 'flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold transition-all flex items-center justify-center space-x-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60';
    contentText.classList.remove('hidden');
    contentFile.classList.add('hidden');
  }
}

function setupDragAndDrop() {
  const dropZone = document.getElementById('drop-zone');
  if (!dropZone) return;

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-brand-500', 'bg-slate-900/80');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-brand-500', 'bg-slate-900/80');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-brand-500', 'bg-slate-900/80');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      accumulateAndAddFiles(Array.from(e.dataTransfer.files));
    }
  });
}

function setupImagePanEvents() {
  const viewport = document.getElementById('preview-img-viewport');
  const img = document.getElementById('preview-img-element');
  if (!viewport || !img) return;

  img.addEventListener('dragstart', (e) => e.preventDefault());

  viewport.addEventListener('mousedown', (e) => {
    isPanning = true;
    startPanX = e.clientX - currentPanX;
    startPanY = e.clientY - currentPanY;
    viewport.classList.add('pan-active');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    e.preventDefault();
    currentPanX = e.clientX - startPanX;
    currentPanY = e.clientY - startPanY;
    applyImageTransform();
  });

  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      viewport.classList.remove('pan-active');
    }
  });
}

function switchTab(tabId) {
  const views = ['dashboard', 'active-room', 'history', 'admin'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('hidden');
  });

  const selectedView = document.getElementById(`view-${tabId}`);
  if (selectedView) selectedView.classList.remove('hidden');

  document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
    btn.classList.remove('bg-brand-600', 'text-white', 'shadow-md');
    btn.classList.add('text-slate-400');
  });
  const activeDeskBtn = document.getElementById(`nav-btn-${tabId}`);
  if (activeDeskBtn) {
    activeDeskBtn.classList.add('bg-brand-600', 'text-white', 'shadow-md');
    activeDeskBtn.classList.remove('text-slate-400');
  }

  document.querySelectorAll('.mobile-nav-item').forEach(btn => {
    btn.classList.remove('text-brand-400');
    btn.classList.add('text-slate-400');
  });
  const activeMobBtn = document.getElementById(`mobile-btn-${tabId}`);
  if (activeMobBtn) {
    activeMobBtn.classList.add('text-brand-400');
    activeMobBtn.classList.remove('text-slate-400');
  }

  if (tabId === 'active-room' && currentRoomCode) {
    loadRoomFiles();
  } else if (tabId === 'history') {
    loadTransferHistory();
  } else if (tabId === 'admin') {
    loadAdminStats();
    loadAdminUsersList();
  }
}

function updateUserUI() {
  const navUserName = document.getElementById('nav-user-name');
  const authBtnIcon = document.getElementById('auth-btn-icon');
  const adminNavDesk = document.getElementById('nav-btn-admin');
  const adminNavMob = document.getElementById('mobile-btn-admin');
  const historyNavDesk = document.getElementById('nav-btn-history');
  const historyNavMob = document.getElementById('mobile-btn-history');

  navUserName.textContent = currentUser.username + (currentUser.role === 'User' ? ' (User)' : currentUser.role === 'Admin' ? ' (Admin)' : '');

  if (currentUser.role === 'Admin') {
    adminNavDesk.classList.remove('hidden');
    adminNavMob.classList.remove('hidden');
  } else {
    adminNavDesk.classList.add('hidden');
    adminNavMob.classList.add('hidden');
  }

  if (currentUser.role === 'Guest') {
    historyNavDesk.classList.add('hidden');
    historyNavMob.classList.add('hidden');
  } else {
    historyNavDesk.classList.remove('hidden');
    historyNavMob.classList.remove('hidden');
  }

  if (currentUser.role !== 'Guest') {
    authBtnIcon.className = 'fa-solid fa-right-from-bracket text-rose-400';
  } else {
    authBtnIcon.className = 'fa-solid fa-right-to-bracket text-slate-300';
  }
}

function handleAuthAction() {
  if (currentUser.role !== 'Guest') {
    Swal.fire({
      title: 'Konfirmasi Keluar',
      text: 'Apakah Anda yakin ingin logout?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Logout',
      cancelButtonText: 'Batal'
    }).then(res => {
      if (res.isConfirmed) {
        currentUser = { username: 'Tamu', role: 'Guest' };
        localStorage.removeItem('wifi_qr_user');
        updateUserUI();
        switchTab('dashboard');
        Swal.fire('Logout Berhasil', 'Sesi login telah berakhir', 'info');
      }
    });
  } else {
    toggleAuthMode('login');
    document.getElementById('modal-login').classList.remove('hidden');
  }
}

function closeLoginModal() {
  document.getElementById('modal-login').classList.add('hidden');
}

function toggleAuthMode(mode) {
  const loginForm = document.getElementById('form-login-element');
  const registerForm = document.getElementById('form-register-element');
  const titleEl = document.getElementById('auth-modal-title');
  const subtitleEl = document.getElementById('auth-modal-subtitle');

  if (mode === 'register') {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    titleEl.textContent = 'Daftar Akun User Baru';
    subtitleEl.textContent = 'Buat akun agar riwayat file Anda tersimpan rapi';
  } else {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    titleEl.textContent = 'Login Pengguna / Admin';
    subtitleEl.textContent = 'Masuk untuk mengakses fitur pengelolaan data';
  }
}

function submitLoginForm(e) {
  e.preventDefault();
  const userVal = document.getElementById('login-username').value.trim();
  const passVal = document.getElementById('login-password').value.trim();
  const btn = document.getElementById('btn-login-submit');

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Memeriksa...`;

  runGAS('loginUser', [userVal, passVal], (res) => {
    btn.disabled = false;
    btn.innerHTML = `<span>Masuk Sekarang</span>`;

    if (res && res.success) {
      currentUser = res.user;
      localStorage.setItem('wifi_qr_user', JSON.stringify(currentUser));
      updateUserUI();
      closeLoginModal();
      Swal.fire('Selamat Datang!', `Berhasil login sebagai ${currentUser.username}`, 'success');
    } else {
      Swal.fire('Login Gagal', res ? res.message : 'Kredensial tidak valid', 'error');
    }
  });
}

function submitRegisterForm(e) {
  e.preventDefault();
  const fullnameVal = document.getElementById('register-fullname').value.trim();
  const userVal = document.getElementById('register-username').value.trim();
  const passVal = document.getElementById('register-password').value.trim();
  const btn = document.getElementById('btn-register-submit');

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Mendaftarkan...`;

  runGAS('registerUser', [userVal, passVal, fullnameVal], (res) => {
    btn.disabled = false;
    btn.innerHTML = `<span>Daftar Akun User Baru</span>`;

    if (res && res.success) {
      currentUser = res.user;
      localStorage.setItem('wifi_qr_user', JSON.stringify(currentUser));
      updateUserUI();
      closeLoginModal();
      Swal.fire('Registrasi Berhasil!', res.message, 'success');
    } else {
      Swal.fire('Gagal Daftar', res ? res.message : 'Kesalahan registrasi', 'error');
    }
  });
}

function loadAdminUsersList() {
  const tbody = document.getElementById('admin-users-table-body');
  tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Memuat data pengguna...</td></tr>`;

  runGAS('adminGetAllUsers', [], (res) => {
    if (res && res.success) {
      adminRawUsers = res.users || [];
      renderAdminUsersTable(adminRawUsers);
    } else {
      adminRawUsers = [];
      tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-rose-400">Gagal memuat data pengguna</td></tr>`;
    }
  });
}

function renderAdminUsersTable(users) {
  const tbody = document.getElementById('admin-users-table-body');
  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-500">Tidak ada pengguna ditemukan.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr class="hover:bg-slate-800/40 transition-colors">
      <td class="p-3">
        <div class="font-bold text-white">${u.fullName}</div>
        <div class="text-[10px] text-slate-400 font-mono">${u.id}</div>
      </td>
      <td class="p-3 font-semibold text-brand-400">${u.username}</td>
      <td class="p-3">
        <span class="px-2 py-0.5 text-[10px] rounded-full font-bold ${u.role === 'Admin' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-700 text-slate-300'}">${u.role}</span>
      </td>
      <td class="p-3">
        <span class="px-2 py-0.5 text-[10px] rounded-full font-semibold ${u.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">${u.isActive ? 'Aktif' : 'Nonaktif'}</span>
      </td>
      <td class="p-3 text-[11px] text-slate-400">${u.createdAt}</td>
      <td class="p-3 text-center">
        <div class="flex items-center justify-center space-x-1.5">
          <button onclick="openUserModalForEdit('${u.id}')" title="Edit" class="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-cyan-400 rounded-lg text-xs transition-all"><i class="fa-solid fa-pen-to-square"></i></button>
          <button onclick="deleteAdminUser('${u.id}', '${u.username}')" title="Hapus" class="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-xs transition-all"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterAdminUsersTable() {
  const q = document.getElementById('admin-users-search').value.toLowerCase();
  const filtered = adminRawUsers.filter(u => u.username.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q));
  renderAdminUsersTable(filtered);
}

function openUserModalForAdd() {
  document.getElementById('admin-user-edit-id').value = '';
  document.getElementById('admin-user-fullname').value = '';
  document.getElementById('admin-user-username').value = '';
  document.getElementById('admin-user-password').value = '';
  document.getElementById('admin-user-role').value = 'User';
  document.getElementById('admin-user-status').value = 'true';

  document.getElementById('admin-user-modal-title').textContent = 'Tambah Pengguna Baru';
  document.getElementById('admin-user-modal-icon').className = 'fa-solid fa-user-plus';
  document.getElementById('admin-password-label').textContent = 'Password';
  document.getElementById('admin-password-hint').classList.add('hidden');
  document.getElementById('btn-admin-user-save').textContent = 'Simpan Pengguna';

  document.getElementById('modal-admin-user').classList.remove('hidden');
}

function openUserModalForEdit(userId) {
  const u = adminRawUsers.find(item => item.id === userId);
  if (!u) return;

  document.getElementById('admin-user-edit-id').value = u.id;
  document.getElementById('admin-user-fullname').value = u.fullName;
  document.getElementById('admin-user-username').value = u.username;
  document.getElementById('admin-user-password').value = '';
  document.getElementById('admin-user-role').value = u.role;
  document.getElementById('admin-user-status').value = u.isActive ? 'true' : 'false';

  document.getElementById('admin-user-modal-title').textContent = `Edit Pengguna: ${u.username}`;
  document.getElementById('admin-user-modal-icon').className = 'fa-solid fa-user-pen';
  document.getElementById('admin-password-label').textContent = 'Password Baru (Opsional)';
  document.getElementById('admin-password-hint').classList.remove('hidden');
  document.getElementById('btn-admin-user-save').textContent = 'Perbarui Pengguna';

  document.getElementById('modal-admin-user').classList.remove('hidden');
}

function closeAdminUserModal() {
  document.getElementById('modal-admin-user').classList.add('hidden');
}

function submitAdminUserForm(e) {
  e.preventDefault();
  const editId = document.getElementById('admin-user-edit-id').value;
  const fullName = document.getElementById('admin-user-fullname').value.trim();
  const username = document.getElementById('admin-user-username').value.trim();
  const password = document.getElementById('admin-user-password').value.trim();
  const role = document.getElementById('admin-user-role').value;
  const isActive = document.getElementById('admin-user-status').value === 'true';

  const payload = {
    isEdit: !!editId,
    id: editId,
    fullName: fullName,
    username: username,
    password: password,
    role: role,
    isActive: isActive
  };

  Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading() });

  runGAS('adminSaveUser', [payload], (res) => {
    Swal.close();
    if (res && res.success) {
      closeAdminUserModal();
      Swal.fire('Berhasil!', res.message, 'success');
      loadAdminUsersList();
    } else {
      Swal.fire('Gagal', res ? res.message : 'Terjadi kesalahan', 'error');
    }
  });
}

function deleteAdminUser(userId, username) {
  if (username === 'admin') {
    Swal.fire('Aksi Ditolak', 'Akun Administrator Utama (admin) tidak dapat dihapus!', 'warning');
    return;
  }

  Swal.fire({
    title: 'Hapus Pengguna',
    text: `Hapus akun [${username}] secara permanen?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Ya, Hapus'
  }).then(res => {
    if (res.isConfirmed) {
      Swal.fire({ title: 'Menghapus...', didOpen: () => Swal.showLoading() });
      runGAS('adminDeleteUser', [userId], (r) => {
        Swal.close();
        if (r && r.success) {
          Swal.fire('Terhapus', r.message, 'success');
          loadAdminUsersList();
        } else {
          Swal.fire('Gagal', r ? r.message : 'Gagal menghapus', 'error');
        }
      });
    }
  });
}

function createNewRoom() {
  Swal.fire({
    title: 'Proteksi PIN Ruangan',
    text: 'Masukkan 4-6 Digit PIN Keamanan opsional (Biarkan kosong jika tanpa PIN):',
    input: 'password',
    inputPlaceholder: 'Contoh: 1234 (Opsional)',
    showCancelButton: true,
    confirmButtonText: 'Buat Ruangan'
  }).then(pinRes => {
    if (pinRes.isDismissed) return;
    const pinVal = pinRes.value ? pinRes.value.trim() : '';

    Swal.fire({
      title: 'Membuat Ruang...',
      text: 'Menggenerasi kode ruang...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    runGAS('createRoom', [currentUser.username, pinVal], (res) => {
      Swal.close();
      if (res && res.success) {
        setRoomActive(res.roomCode, res.hasPin);
        Swal.fire({
          title: 'Ruangan Siap!',
          text: `Kode Ruangan: ${res.roomCode} ${res.hasPin ? '(Dilindungi PIN)' : ''}`,
          icon: 'success',
          confirmButtonText: 'Lihat Ruangan'
        }).then(() => switchTab('active-room'));
      } else {
        Swal.fire('Gagal', 'Gagal membuat ruangan baru', 'error');
      }
    });
  });
}

function setRoomActive(code, hasPin = false) {
  if (currentRoomCode && currentRoomCode !== code) {
    localGuestUploads = [];
  }
  currentRoomCode = code;
  localStorage.setItem('wifi_qr_active_room', code);

  document.getElementById('active-room-badge').classList.remove('hidden');
  document.getElementById('badge-room-code').textContent = code;
  document.getElementById('room-display-code').textContent = code;

  const pinBadge = document.getElementById('pin-protected-badge');
  if (hasPin) pinBadge.classList.remove('hidden'); else pinBadge.classList.add('hidden');

  const qrContainer = document.getElementById('qrcode-canvas');
  qrContainer.innerHTML = '';
  new QRCode(qrContainer, {
    text: code,
    width: 144,
    height: 144,
    colorDark: "#0f172a",
    colorLight: "#ffffff"
  });
}

function promptManualRoomCode() {
  Swal.fire({
    title: 'Gabung Ruangan',
    input: 'text',
    inputLabel: 'Masukkan Kode Ruang 6-Digit:',
    inputPlaceholder: 'Contoh: 849201',
    showCancelButton: true,
    confirmButtonText: 'Lanjut'
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      joinRoomWithCode(result.value.trim().toUpperCase());
    }
  });
}

function joinRoomWithCode(code, pinInput = '') {
  Swal.fire({ title: 'Memeriksa Ruangan...', didOpen: () => Swal.showLoading() });
  runGAS('joinRoom', [code, pinInput], (res) => {
    Swal.close();
    if (res && res.success) {
      setRoomActive(code, false);
      Swal.fire('Terhubung!', `Anda telah masuk ke Ruang ${code}`, 'success')
        .then(() => switchTab('active-room'));
    } else if (res && res.requirePin) {
      Swal.fire({
        title: 'PIN Ruangan Diperlukan',
        text: res.message,
        input: 'password',
        inputPlaceholder: 'Masukkan PIN Ruangan',
        showCancelButton: true,
        confirmButtonText: 'Verifikasi PIN'
      }).then(pinRes => {
        if (pinRes.isConfirmed && pinRes.value) {
          joinRoomWithCode(code, pinRes.value.trim());
        }
      });
    } else {
      Swal.fire('Ruang Tidak Ditemukan', res ? res.message : 'Kode ruang tidak valid', 'error');
    }
  });
}

function openQRScannerModal() {
  document.getElementById('modal-qr-scanner').classList.remove('hidden');
  if (!html5QrScannerInstance) {
    html5QrScannerInstance = new Html5Qrcode("qr-reader-view");
  }

  const config = { fps: 10, qrbox: { width: 220, height: 220 } };
  html5QrScannerInstance.start(
    { facingMode: "environment" },
    config,
    (decodedText) => {
      closeQRScannerModal();
      joinRoomWithCode(decodedText.trim().toUpperCase());
    },
    () => {}
  ).catch(() => {
    closeQRScannerModal();
    Swal.fire('Kamera Tidak Tersedia', 'Izin kamera ditolak atau tidak didukung browser.', 'warning');
  });
}

function closeQRScannerModal() {
  if (html5QrScannerInstance && html5QrScannerInstance.isScanning) {
    html5QrScannerInstance.stop().then(() => {
      document.getElementById('modal-qr-scanner').classList.add('hidden');
    });
  } else {
    document.getElementById('modal-qr-scanner').classList.add('hidden');
  }
}

function handleFileSelect(evt) {
  if (evt.target.files && evt.target.files.length > 0) {
    accumulateAndAddFiles(Array.from(evt.target.files));
  }
}

function accumulateAndAddFiles(newFiles) {
  newFiles.forEach(newFile => {
    const exists = selectedFiles.some(f => f.name === newFile.name && f.size === newFile.size);
    if (!exists) {
      selectedFiles.push(newFile);
    }
  });
  updateFileSelectionUI();
}

function removeSelectedFile(index) {
  selectedFiles.splice(index, 1);
  updateFileSelectionUI();
}

function updateFileSelectionUI() {
  const info = document.getElementById('file-preview-info');
  const previewContainer = document.getElementById('file-preview-container');
  const submitBtn = document.getElementById('btn-submit-multiple');
  
  previewContainer.innerHTML = '';
  
  if (selectedFiles.length > 0) {
    previewContainer.classList.remove('hidden');
    submitBtn.classList.remove('hidden');
    submitBtn.classList.add('flex');
    
    selectedFiles.forEach((file, idx) => {
      const isImg = file.type.startsWith('image/');
      const fileUrl = isImg ? URL.createObjectURL(file) : '';
      const iconClass = getFileIconClass(file.type, file.name);

      const itemEl = document.createElement('div');
      itemEl.className = 'bg-slate-950 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center sm:items-start relative shadow';
      
      itemEl.innerHTML = `
        <div class="relative w-24 h-24 sm:w-28 sm:h-28 bg-slate-900 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border border-slate-800">
          ${isImg ? `<img src="${fileUrl}" class="w-full h-full object-cover">` : `
            <div class="text-brand-400 text-3xl flex flex-col items-center justify-center">
              <i class="${iconClass}"></i>
              <span class="text-[9px] text-slate-400 font-mono mt-1">${file.name.split('.').pop().toUpperCase()}</span>
            </div>
          `}
          <button onclick="removeSelectedFile(${idx})" class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white flex items-center justify-center text-xs shadow transition-all">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="flex-1 w-full space-y-2">
          <div class="flex flex-col">
            <span class="text-xs font-bold text-white truncate max-w-xs sm:max-w-md" title="${file.name}">${file.name}</span>
            <span class="text-[10px] text-brand-400 font-mono">${(file.size / 1024 / 1024).toFixed(2)} MB • ${file.type || 'Berkas Dokumen'}</span>
          </div>

          <div class="space-y-1">
            <label class="block text-[11px] font-semibold text-slate-300">Keterangan Khusus Berkas Ini:</label>
            <textarea id="file-desc-input-${idx}" rows="2" placeholder="Catatan untuk file ini..." class="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"></textarea>
          </div>
        </div>
      `;
      previewContainer.appendChild(itemEl);
    });

    const totalSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);
    info.textContent = `${selectedFiles.length} berkas siap dikirim (Total: ${(totalSize / 1024 / 1024).toFixed(2)} MB)`;
    info.classList.remove('hidden');
  } else {
    previewContainer.classList.add('hidden');
    submitBtn.classList.add('hidden');
    submitBtn.classList.remove('flex');
    info.classList.add('hidden');
  }
  document.getElementById('file-input').value = '';
}

function confirmAndUploadMultipleFiles() {
  if (!currentRoomCode) {
    Swal.fire('Ruang Belum Aktif', 'Silakan buat atau gabung ruangan terlebih dahulu.', 'warning');
    return;
  }
  if (!selectedFiles || selectedFiles.length === 0) {
    Swal.fire('Belum Ada Berkas', 'Silakan pilih berkas terlebih dahulu.', 'warning');
    return;
  }

  const retention = document.getElementById('retention-select').value;
  executeBatchFileUpload(selectedFiles, retention);
}

function executeBatchFileUpload(files, retention) {
  const totalFiles = files.length;
  Swal.fire({
    title: 'Mengunggah Berkas Multiple...',
    text: `Memproses 1 dari ${totalFiles} berkas...`,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  function processFile(index) {
    if (index >= totalFiles) {
      Swal.fire('Berhasil!', `Seluruh ${totalFiles} berkas berhasil dikirim ke ruangan.`, 'success')
        .then(() => {
          selectedFiles = [];
          document.getElementById('file-preview-container').classList.add('hidden');
          document.getElementById('file-preview-container').innerHTML = '';
          document.getElementById('file-preview-info').classList.add('hidden');
          document.getElementById('btn-submit-multiple').classList.add('hidden');
          document.getElementById('btn-submit-multiple').classList.remove('flex');
          document.getElementById('file-input').value = '';
          switchTab('active-room');
        });
      return;
    }

    const file = files[index];
    const descInputEl = document.getElementById(`file-desc-input-${index}`);
    const fileDescription = descInputEl ? descInputEl.value.trim() : '';

    const reader = new FileReader();
    reader.onload = function(e) {
      const base64Data = e.target.result.split(',')[1];
      const payload = {
        roomCode: currentRoomCode,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64Data: base64Data,
        retentionPolicy: retention,
        senderDevice: `${currentUser.username} (${navigator.platform})`,
        fileDescription: fileDescription,
        uploadedBy: currentUser.username
      };

      runGAS('uploadFileToRoom', [payload], (res) => {
        processFile(index + 1);
      });
    };
    reader.readAsDataURL(file);
  }
  processFile(0);
}

function uploadTextContent() {
  const textVal = document.getElementById('text-share-input').value.trim();
  if (!textVal) return;

  if (!currentRoomCode) {
    Swal.fire('Ruang Belum Aktif', 'Silakan buat atau gabung ruangan terlebih dahulu.', 'warning');
    return;
  }

  const retention = document.getElementById('retention-select').value;
  Swal.fire({ title: 'Mengirim Pesan...', didOpen: () => Swal.showLoading() });

  const payload = {
    roomCode: currentRoomCode,
    fileName: `Pesan Teks: ${textVal.substring(0, 25)}...`,
    mimeType: 'text/plain',
    base64Data: btoa(unescape(encodeURIComponent(textVal))),
    retentionPolicy: retention,
    senderDevice: `${currentUser.username} (${navigator.platform})`,
    fileDescription: textVal,
    uploadedBy: currentUser.username
  };

  runGAS('uploadFileToRoom', [payload], (res) => {
    Swal.close();
    if (res && res.success) {
      document.getElementById('text-share-input').value = '';
      Swal.fire('Berhasil!', 'Pesan teks berhasil dikirim ke ruangan', 'success')
        .then(() => switchTab('active-room'));
    } else {
      Swal.fire('Gagal Mengirim', res ? res.message : 'Gagal mengirim teks', 'error');
    }
  });
}

function executeDownloadAllZip() {
  if (!currentRoomCode) return;

  Swal.fire({
    title: 'Menyiapkan ZIP...',
    text: 'Mengompres seluruh berkas dalam ruangan...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  runGAS('downloadAllRoomFiles', [currentRoomCode], (res) => {
    Swal.close();
    if (res && res.success && res.base64Data) {
      const link = document.createElement('a');
      link.href = 'data:application/zip;base64,' + res.base64Data;
      link.download = res.fileName || `WiFi_QR_Room_${currentRoomCode}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      loadRoomFiles();
    } else {
      Swal.fire('Gagal Unduh ZIP', res ? res.message : 'Tidak ada berkas aktif.', 'error');
    }
  });
}

function loadRoomFiles() {
  if (!currentRoomCode) return;
  const container = document.getElementById('room-files-container');
  container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400"><i class="fa-solid fa-spinner fa-spin text-2xl"></i><p class="mt-2 text-xs">Memuat berkas...</p></div>`;

  runGAS('getRoomFiles', [currentRoomCode], (res) => {
    if (res && res.success && res.files && res.files.length > 0) {
      currentActiveFiles = res.files;
      renderRoomFilesList(currentActiveFiles);
    } else {
      currentActiveFiles = [];
      container.innerHTML = `
        <div class="col-span-full text-center py-12 text-slate-500">
          <i class="fa-solid fa-box-open text-4xl mb-2"></i>
          <p class="text-sm">Belum ada berkas terbagikan di ruangan ini.</p>
        </div>`;
    }
  });
}

function renderRoomFilesList(files) {
  const container = document.getElementById('room-files-container');
  if (!files || files.length === 0) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12 text-slate-500">
        <i class="fa-solid fa-filter-circle-xmark text-4xl mb-2"></i>
        <p class="text-sm">Tidak ada berkas yang cocok dengan pencarian.</p>
      </div>`;
    return;
  }

  container.innerHTML = files.map((f) => {
    const idx = currentActiveFiles.indexOf(f);
    const isImage = isImageMime(f.fileType, f.fileName);
    const isVideo = isVideoMime(f.fileType, f.fileName);
    const isDoc = isDocumentMime(f.fileType, f.fileName);
    const imageUrl = f.fileId ? `https://lh3.googleusercontent.com/d/${f.fileId}` : f.downloadUrl;
    const isBurn = f.retentionPolicy === 'BURN';

    return `
      <div class="bg-slate-900/90 border border-slate-700/80 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-brand-500/50 transition-all shadow-lg group">
        ${isImage ? `
          <div class="relative w-full h-36 bg-slate-950 overflow-hidden cursor-pointer" onclick="openPreviewModalByIndex(${idx})">
            <img src="${imageUrl}" alt="${f.fileName}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" onerror="this.onerror=null; this.src='https://placehold.co/600x400/0f172a/3b82f6?text=Image+Preview';">
            <div class="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-semibold text-xs space-x-1 backdrop-blur-[2px]">
              <i class="fa-solid fa-eye text-sm"></i><span>Pratinjau Foto</span>
            </div>
          </div>
        ` : isVideo ? `
          <div class="relative w-full h-36 bg-slate-950 overflow-hidden cursor-pointer flex items-center justify-center group" onclick="openPreviewModalByIndex(${idx})">
            <div class="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
              <div class="w-12 h-12 rounded-full bg-brand-600/80 text-white flex items-center justify-center text-lg"><i class="fa-solid fa-play ml-0.5"></i></div>
            </div>
          </div>
        ` : isDoc ? `
          <div class="relative w-full h-24 bg-slate-950 overflow-hidden cursor-pointer flex items-center justify-center border-b border-slate-800" onclick="openPreviewModalByIndex(${idx})">
            <div class="flex items-center space-x-2 text-brand-400">
              <i class="${getFileIconClass(f.fileType, f.fileName)} text-3xl"></i>
              <span class="text-xs font-bold text-slate-200">Pratinjau Dokumen</span>
            </div>
          </div>
        ` : ''}

        <div class="p-4 space-y-3 flex-1 flex flex-col justify-between">
          <div class="space-y-1.5">
            <div class="flex items-start space-x-3 overflow-hidden">
              <div class="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 flex items-center justify-center shrink-0">
                <i class="${getFileIconClass(f.fileType, f.fileName)} text-lg"></i>
              </div>
              <div class="overflow-hidden">
                <h4 class="text-xs font-bold text-white truncate" title="${f.fileName}">${f.fileName}</h4>
                <p class="text-[10px] text-slate-400">${f.fileSize} • Upload: <strong class="text-slate-300">${f.uploadedBy || 'Tamu'}</strong></p>
              </div>
            </div>

            ${f.fileDescription ? `
              <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 italic flex items-start space-x-1.5">
                <i class="fa-solid fa-quote-left text-brand-400 mt-0.5 shrink-0"></i>
                <span class="line-clamp-3 whitespace-pre-wrap">${f.fileDescription}</span>
              </div>
            ` : ''}
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-800 text-[10px]">
            <span class="px-2 py-0.5 rounded ${isBurn ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold animate-pulse' : 'bg-slate-800 text-slate-300 font-mono'}">
              ${isBurn ? '🔥 Self-Destruct' : '⏱️ Retensi'}
            </span>
            <span id="countdown-timer-${f.logId}" data-expires="${f.expiresAt}" class="font-mono font-bold text-emerald-400">Menghitung...</span>
          </div>
        </div>

        <div class="px-4 py-3 bg-slate-800/80 border-t border-slate-800/80 flex items-center space-x-2">
          <button onclick="openPreviewModalByIndex(${idx})" class="flex-1 py-1.5 px-3 bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5">
            <i class="fa-solid fa-eye text-brand-400"></i><span>Lihat</span>
          </button>
          
          <a href="${f.downloadUrl}" target="_blank" onclick="handleDirectDownloadFromCard(event, '${f.logId}', ${isBurn})" download class="py-1.5 px-3 bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-md">
            <i class="fa-solid fa-download"></i>
            <span class="hidden sm:inline">${isBurn ? 'Unduh & Hapus' : 'Unduh'}</span>
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function filterRoomFilesList() {
  const q = document.getElementById('room-files-search').value.toLowerCase();
  const typeFilter = document.getElementById('room-files-type-filter').value;

  const filtered = currentActiveFiles.filter(f => {
    const matchQuery = f.fileName.toLowerCase().includes(q) || 
                       (f.fileDescription && f.fileDescription.toLowerCase().includes(q)) ||
                       f.senderDevice.toLowerCase().includes(q);
    if (!matchQuery) return false;
    if (typeFilter === 'ALL') return true;
    return checkFileTypeMatch(f.fileType, f.fileName, typeFilter);
  });
  renderRoomFilesList(filtered);
}

function checkFileTypeMatch(mime, fileName, category) {
  if (category === 'image') return isImageMime(mime, fileName);
  if (category === 'video') return isVideoMime(mime, fileName);
  if (category === 'pdf') return (mime && mime.includes('pdf')) || fileName.toLowerCase().endsWith('.pdf');
  if (category === 'word') return (mime && (mime.includes('word') || mime.includes('document'))) || ['doc', 'docx'].some(ext => fileName.toLowerCase().endsWith('.' + ext));
  if (category === 'excel') return (mime && (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv'))) || ['xls', 'xlsx', 'csv'].some(ext => fileName.toLowerCase().endsWith('.' + ext));
  if (category === 'text') return isTextMime(mime, fileName) || fileName.startsWith('Pesan Teks:');
  if (category === 'zip') return (mime && (mime.includes('zip') || mime.includes('rar') || mime.includes('tar'))) || ['zip', 'rar', '7z', 'tar', 'gz'].some(ext => fileName.toLowerCase().endsWith('.' + ext));
  return true;
}

function startLiveCountdownTimer() {
  if (liveCountdownInterval) clearInterval(liveCountdownInterval);

  liveCountdownInterval = setInterval(() => {
    const timerElements = document.querySelectorAll('[id^="countdown-timer-"]');
    const now = new Date().getTime();

    timerElements.forEach(el => {
      const expiresAttr = el.getAttribute('data-expires');
      if (expiresAttr === 'BURN_AFTER_READ' || expiresAttr === 'BURN') {
        el.innerHTML = `<span class="text-rose-400 font-bold">🔥 Burn After Read</span>`;
        return;
      }
      if (!expiresAttr || expiresAttr === 'NEVER') {
        el.innerHTML = `<span class="text-cyan-400 font-semibold">♾️ Permanen</span>`;
        return;
      }

      const expireTime = new Date(expiresAttr).getTime();
      const diff = expireTime - now;

      if (isNaN(expireTime) || diff <= 0) {
        el.innerHTML = `<span class="text-rose-500 font-bold">⚠️ Kedaluwarsa</span>`;
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const dayPrefix = days > 0 ? `${days}h ` : '';
        const hStr = hours < 10 ? '0' + hours : hours;
        const mStr = minutes < 10 ? '0' + minutes : minutes;
        const sStr = seconds < 10 ? '0' + seconds : seconds;

        el.innerHTML = `<span class="text-emerald-400 font-mono font-bold">${dayPrefix}${hStr}:${mStr}:${sStr}</span>`;
      }
    });
  }, 1000);
}

function handleDirectDownloadFromCard(evt, logId, isBurn) {
  if (isBurn) {
    Swal.fire({
      title: 'Fitur Self-Destruct!',
      text: 'Berkas ini akan terhapus permanen setelah diunduh.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Unduh Sekarang'
    }).then(res => {
      if (res.isConfirmed) {
        runGAS('burnFileAfterRead', [logId], () => {
          setTimeout(() => loadRoomFiles(), 1500);
        });
      } else {
        evt.preventDefault();
      }
    });
  }
}

function handleDirectDownloadFromPreview(evt) {
  if (currentPreviewData && currentPreviewData.retentionPolicy === 'BURN') {
    runGAS('burnFileAfterRead', [currentPreviewData.logId], () => {
      closePreviewModal();
      setTimeout(() => loadRoomFiles(), 1500);
    });
  }
}

function openPreviewModalByIndex(index) {
  if (currentActiveFiles && currentActiveFiles[index]) {
    openPreviewModal(currentActiveFiles[index]);
  }
}

function openPreviewModalFromHistory(logId) {
  const item = rawHistoryLogs.find(l => l.logId === logId);
  if (item) {
    openPreviewModal(item);
  }
}

function openPreviewModal(fileObj) {
  currentPreviewData = fileObj;

  const titleEl = document.getElementById('preview-file-title');
  const subtitleEl = document.getElementById('preview-file-subtitle');
  const iconTypeEl = document.getElementById('preview-icon-type');
  const descBox = document.getElementById('preview-description-box');
  const descText = document.getElementById('preview-description-text');
  const imgContainer = document.getElementById('preview-image-container');
  const imgEl = document.getElementById('preview-img-element');
  const docContainer = document.getElementById('preview-doc-container');
  const docIframe = document.getElementById('preview-doc-iframe');
  const btnOpenDocExternal = document.getElementById('btn-open-doc-external');
  const videoContainer = document.getElementById('preview-video-container');
  const videoIframe = document.getElementById('preview-video-iframe');
  const textContainer = document.getElementById('preview-text-container');
  const textEl = document.getElementById('preview-text-element');
  const genericContainer = document.getElementById('preview-generic-container');
  const genericIcon = document.getElementById('preview-generic-icon');
  const senderEl = document.getElementById('preview-info-sender');
  const retentionEl = document.getElementById('preview-info-retention');
  const downloadBtn = document.getElementById('btn-download-preview');

  titleEl.textContent = fileObj.fileName || 'Berkas Terbagikan';
  subtitleEl.textContent = `${fileObj.fileSize || 'Ukuran T/A'} • Upload: ${fileObj.uploadedBy || 'Tamu'}`;
  senderEl.textContent = fileObj.senderDevice || 'Pengguna';
  retentionEl.textContent = fileObj.retentionPolicy || '24H';
  downloadBtn.href = fileObj.downloadUrl || '#';

  imgContainer.classList.add('hidden');
  docContainer.classList.add('hidden');
  videoContainer.classList.add('hidden');
  textContainer.classList.add('hidden');
  genericContainer.classList.add('hidden');
  videoIframe.src = '';
  docIframe.src = '';

  resetImageZoom();

  const fileType = fileObj.fileType || '';
  const isImg = isImageMime(fileType, fileObj.fileName);
  const isVid = isVideoMime(fileType, fileObj.fileName);
  const isDoc = isDocumentMime(fileType, fileObj.fileName);
  const isTxt = isTextMime(fileType, fileObj.fileName) || fileObj.fileName.startsWith('Pesan Teks:');

  if (fileObj.fileDescription && !isTxt) {
    descText.textContent = fileObj.fileDescription;
    descBox.classList.remove('hidden');
  } else {
    descBox.classList.add('hidden');
  }

  if (isImg) {
    iconTypeEl.innerHTML = `<i class="fa-solid fa-image text-brand-400"></i>`;
    const imgUrl = fileObj.fileId ? `https://lh3.googleusercontent.com/d/${fileObj.fileId}` : fileObj.downloadUrl;
    imgEl.src = imgUrl;
    imgContainer.classList.remove('hidden');
  } else if (isVid) {
    iconTypeEl.innerHTML = `<i class="fa-solid fa-film text-brand-400"></i>`;
    videoIframe.src = fileObj.fileId ? `https://drive.google.com/file/d/${fileObj.fileId}/preview` : fileObj.downloadUrl;
    videoContainer.classList.remove('hidden');
  } else if (isDoc) {
    iconTypeEl.innerHTML = `<i class="${getFileIconClass(fileType, fileObj.fileName)}"></i>`;
    let docViewerUrl = fileObj.fileId 
      ? `https://drive.google.com/file/d/${fileObj.fileId}/preview`
      : `https://docs.google.com/gview?url=${encodeURIComponent(fileObj.downloadUrl)}&embedded=true`;
    docIframe.src = docViewerUrl;
    btnOpenDocExternal.href = docViewerUrl;
    docContainer.classList.remove('hidden');
  } else if (isTxt) {
    iconTypeEl.innerHTML = `<i class="fa-solid fa-file-lines text-cyan-400"></i>`;
    let textVal = fileObj.fileName.replace('Pesan Teks: ', '');
    if (fileObj.base64Data) {
      try { textVal = decodeURIComponent(escape(atob(fileObj.base64Data))); } catch(e){}
    } else if (fileObj.fileDescription) {
      textVal = fileObj.fileDescription;
    }
    textEl.textContent = textVal;
    textContainer.classList.remove('hidden');
  } else {
    const iconClass = getFileIconClass(fileType, fileObj.fileName);
    iconTypeEl.innerHTML = `<i class="${iconClass}"></i>`;
    genericIcon.className = `${iconClass} text-indigo-400`;
    genericContainer.classList.remove('hidden');
  }

  document.getElementById('modal-preview').classList.remove('hidden');
}

function togglePreviewFullScreen() {
  const card = document.getElementById('preview-modal-card');
  const icon = document.getElementById('fullscreen-icon');
  if (!card.classList.contains('is-fullscreen')) {
    card.classList.add('is-fullscreen', 'w-screen', 'h-screen', 'max-w-none', 'max-h-none', 'rounded-none');
    card.classList.remove('max-w-4xl', 'max-h-[92vh]', 'rounded-2xl');
    icon.className = 'fa-solid fa-compress text-sm';
  } else {
    card.classList.remove('is-fullscreen', 'w-screen', 'h-screen', 'max-w-none', 'max-h-none', 'rounded-none');
    card.classList.add('max-w-4xl', 'max-h-[92vh]', 'rounded-2xl');
    icon.className = 'fa-solid fa-expand text-sm';
  }
}

function zoomInImage() {
  currentZoomScale = Math.min(currentZoomScale + 0.25, 4.0);
  applyImageTransform();
}

function zoomOutImage() {
  currentZoomScale = Math.max(currentZoomScale - 0.25, 0.5);
  applyImageTransform();
}

function rotateImage() {
  currentRotation = (currentRotation + 90) % 360;
  applyImageTransform();
}

function resetImageZoom() {
  currentZoomScale = 1.0;
  currentRotation = 0;
  currentPanX = 0;
  currentPanY = 0;
  applyImageTransform();
}

function applyImageTransform() {
  const img = document.getElementById('preview-img-element');
  const badge = document.getElementById('zoom-percentage-badge');
  if (img) img.style.transform = `translate(${currentPanX}px, ${currentPanY}px) scale(${currentZoomScale}) rotate(${currentRotation}deg)`;
  if (badge) badge.textContent = `${Math.round(currentZoomScale * 100)}%`;
}

function closePreviewModal() {
  document.getElementById('preview-video-iframe').src = '';
  document.getElementById('preview-doc-iframe').src = '';
  document.getElementById('modal-preview').classList.add('hidden');
  currentPreviewData = null;
}

function copyTextPreview() {
  const textEl = document.getElementById('preview-text-element');
  navigator.clipboard.writeText(textEl.textContent).then(() => {
    Notify.toast({ title: 'Isi teks berhasil disalin!', icon: 'success' });
  });
}

function copyDescriptionPreview() {
  const descTextEl = document.getElementById('preview-description-text');
  navigator.clipboard.writeText(descTextEl.textContent).then(() => {
    Notify.toast({ title: 'Keterangan berhasil disalin!', icon: 'success' });
  });
}

function copyPreviewDownloadLink() {
  if (currentPreviewData && currentPreviewData.downloadUrl) {
    navigator.clipboard.writeText(currentPreviewData.downloadUrl).then(() => {
      Notify.toast({ title: 'Tautan unduh berhasil disalin!', icon: 'success' });
    });
  }
}

function loadTransferHistory() {
  const tbody = document.getElementById('history-table-body');
  const subtitleEl = document.getElementById('history-view-subtitle');

  tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Memuat riwayat...</td></tr>`;

  runGAS('getAllTransferLogs', [], (res) => {
    if (res && res.success) {
      if (currentUser.role === 'Admin') {
        if (subtitleEl) subtitleEl.textContent = 'Log global seluruh ruangan (Mode Admin)';
        rawHistoryLogs = res.logs || [];
      } else {
        if (subtitleEl) subtitleEl.textContent = `Log berkas akun: ${currentUser.username} (Data Terisolasi)`;
        const targetUser = (currentUser.username || 'Tamu').toLowerCase();
        rawHistoryLogs = (res.logs || []).filter(l => (l.uploadedBy || 'Tamu').toLowerCase() === targetUser);
      }
      filterHistoryTable();
    } else {
      rawHistoryLogs = [];
      tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-rose-400">Gagal memuat data riwayat</td></tr>`;
    }
  });
}

function renderHistoryTable(logs) {
  const tbody = document.getElementById('history-table-body');
  if (!logs || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-500">Belum ada riwayat transfer ditemukan.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(l => `
    <tr class="hover:bg-slate-800/40 transition-colors">
      <td class="p-3 text-[11px] text-slate-400">${l.timestamp}</td>
      <td class="p-3 font-mono font-bold text-brand-400">${l.roomCode}</td>
      <td class="p-3 font-medium text-slate-200 max-w-xs">
        <div class="flex items-center space-x-2">
          <i class="${getFileIconClass(l.fileType || '', l.fileName)} text-slate-400 shrink-0"></i>
          <span class="truncate font-bold" title="${l.fileName}">${l.fileName}</span>
        </div>
        ${l.fileDescription ? `<div class="text-[10px] text-slate-400 italic mt-0.5 truncate">📝 ${l.fileDescription}</div>` : ''}
      </td>
      <td class="p-3 text-slate-400">${l.fileSize}</td>
      <td class="p-3">
        <span class="px-2 py-0.5 text-[10px] rounded-full ${l.isDeleted ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'} font-semibold">
          ${l.isDeleted ? 'Dihapus' : l.retentionPolicy}
        </span>
      </td>
      <td class="p-3 text-center">
        <div class="flex items-center justify-center space-x-1">
          <button onclick="openPreviewModalFromHistory('${l.logId}')" title="Lihat" class="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-brand-400 rounded text-[11px]"><i class="fa-solid fa-eye"></i></button>
          ${!l.isDeleted && l.downloadUrl !== 'Expired' ? `
            <a href="${l.downloadUrl}" target="_blank" download title="Unduh" class="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded text-[11px]"><i class="fa-solid fa-download"></i></a>` : `<span class="text-slate-600 text-[10px]">-</span>`}
        </div>
      </td>
    </tr>
  `).join('');
}

function filterHistoryTable() {
  const q = (document.getElementById('history-search')?.value || '').toLowerCase();
  const typeFilter = document.getElementById('history-type-filter')?.value || 'ALL';

  const filtered = rawHistoryLogs.filter(l => {
    const matchQuery = l.fileName.toLowerCase().includes(q) || 
                       l.roomCode.toLowerCase().includes(q) ||
                       (l.fileDescription && l.fileDescription.toLowerCase().includes(q)) ||
                       l.senderDevice.toLowerCase().includes(q);
    if (!matchQuery) return false;
    if (typeFilter === 'ALL') return true;
    return checkFileTypeMatch(l.fileType, l.fileName, typeFilter);
  });
  renderHistoryTable(filtered);
}

function loadAdminStats() {
  runGAS('getAdminStats', [], (res) => {
    if (res && res.success) {
      document.getElementById('admin-stat-total-files').textContent = res.totalFiles;
      document.getElementById('storage-used-label').textContent = res.storageUsedFormatted || '0 MB';
      document.getElementById('storage-free-label').textContent = res.storageFreeFormatted || '0 GB';
      document.getElementById('storage-limit-label').textContent = res.storageLimitFormatted || '0 GB';
      
      const percent = res.percentUsed || 0;
      document.getElementById('storage-percent-label').textContent = `${percent}% Terpakai`;
      
      const gaugeBar = document.getElementById('storage-gauge-bar');
      gaugeBar.style.width = `${Math.min(100, percent)}%`;
      if (percent > 90) {
        gaugeBar.className = 'h-full bg-gradient-to-r from-rose-600 to-red-500 rounded-full transition-all duration-500';
      } else if (percent > 70) {
        gaugeBar.className = 'h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500';
      } else {
        gaugeBar.className = 'h-full bg-gradient-to-r from-brand-500 to-cyan-400 rounded-full transition-all duration-500';
      }
    }
  });
}

function runManualAutoCleanup() {
  Swal.fire({
    title: 'Menjalankan Pembersihan...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  runGAS('autoCleanupExpiredFiles', [], (res) => {
    Swal.close();
    if (res && res.success) {
      Swal.fire('Selesai', `Menghapus ${res.deletedCount} berkas kedaluwarsa.`, 'success');
    } else {
      Swal.fire('Gagal', 'Pembersihan gagal dieksekusi', 'error');
    }
  });
}

function executeDatabaseSetup() {
  Swal.fire({
    title: 'Inisialisasi Database',
    text: 'Akan membuat sheet Users, Device_Rooms, dan Transfer_Logs di Spreadsheet backend.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Proses'
  }).then(res => {
    if (res.isConfirmed) {
      Swal.fire({ title: 'Menginisialisasi...', didOpen: () => Swal.showLoading() });
      runGAS('setupDatabase', [], (r) => {
        Swal.close();
        if (r && r.success) {
          Swal.fire('Berhasil!', r.message, 'success');
        } else {
          Swal.fire('Gagal', r ? r.message : 'Kesalahan inisialisasi', 'error');
        }
      });
    }
  });
}

function isImageMime(mime, fileName = '') {
  if (mime && mime.includes('image')) return true;
  const ext = fileName.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext);
}

function isVideoMime(mime, fileName = '') {
  if (mime && mime.includes('video')) return true;
  const ext = fileName.split('.').pop().toLowerCase();
  return ['mp4', 'webm', 'ogg', 'mov', 'm4v', 'avi', 'mkv'].includes(ext);
}

function isDocumentMime(mime, fileName = '') {
  if (mime && (mime.includes('pdf') || mime.includes('document') || mime.includes('word') || mime.includes('sheet') || mime.includes('excel') || mime.includes('presentation'))) return true;
  const ext = fileName.split('.').pop().toLowerCase();
  return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'rtf'].includes(ext);
}

function isTextMime(mime, fileName = '') {
  if (mime && mime.includes('text')) return true;
  const ext = fileName.split('.').pop().toLowerCase();
  return ['txt', 'md', 'json', 'csv', 'js', 'html', 'css', 'py', 'java', 'xml', 'log'].includes(ext);
}

function getFileIconClass(mimeOrType, fileName = '') {
  const ext = fileName.split('.').pop().toLowerCase();
  if (isImageMime(mimeOrType, fileName)) return 'fa-solid fa-file-image text-emerald-400';
  if (isVideoMime(mimeOrType, fileName)) return 'fa-solid fa-file-video text-brand-400';
  if (mimeOrType.includes('pdf') || ext === 'pdf') return 'fa-solid fa-file-pdf text-rose-400';
  if (mimeOrType.includes('word') || ['doc', 'docx'].includes(ext)) return 'fa-solid fa-file-word text-blue-400';
  if (mimeOrType.includes('excel') || mimeOrType.includes('sheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'fa-solid fa-file-excel text-emerald-400';
  if (mimeOrType.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)) return 'fa-solid fa-file-powerpoint text-amber-400';
  if (isTextMime(mimeOrType, fileName)) return 'fa-solid fa-file-lines text-cyan-400';
  if (mimeOrType.includes('zip') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'fa-solid fa-file-zipper text-purple-400';
  return 'fa-solid fa-file text-slate-400';
}