/**
 * Google Apps Script API Bridge
 * Pengganti google.script.run menggunakan fetch API berbasis REST POST
 */
const GASBridge = {
  async call(action, params = []) {
    if (!CONFIG.GAS_WEB_APP_URL || CONFIG.GAS_WEB_APP_URL.includes("CONTOH_DEPLOYMENT_ID")) {
      console.warn("[GASBridge] Menggunakan Dev Mock (URL GAS belum diisi)");
      return this.mockFallback(action, params);
    }

    const payload = {
      action: action,
      params: params
    };

    try {
      const response = await fetch(CONFIG.GAS_WEB_APP_URL, {
        method: "POST",
        // Menggunakan text/plain agar browser tidak mengirim request OPTIONS (Preflight) yang tidak didukung GAS
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload),
        redirect: "follow"
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`[GASBridge] Gagal mengeksekusi aksi '${action}':`, error);
      return { success: false, message: error.message || "Gagal menghubungi server GAS" };
    }
  },

  // Fallback dev mode jika dijalankan di localhost sebelum deployment
  mockFallback(funcName, params) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (funcName === 'loginUser') {
          resolve({ success: true, user: { username: params[0], role: params[0] === 'admin' ? 'Admin' : 'User' } });
        } else if (funcName === 'registerUser') {
          resolve({ success: true, message: 'Registrasi berhasil (Mock)', user: { username: params[0], role: 'User' } });
        } else if (funcName === 'createRoom') {
          resolve({ success: true, roomCode: Math.floor(100000 + Math.random() * 900000).toString(), hasPin: !!params[1] });
        } else if (funcName === 'joinRoom') {
          resolve({ success: true, roomCode: params[0] });
        } else if (funcName === 'uploadFileToRoom') {
          resolve({ success: true, logId: 'LOG-' + Math.random().toString(36).substring(2, 8) });
        } else if (funcName === 'getRoomFiles') {
          resolve({ success: true, files: [] });
        } else if (funcName === 'getAllTransferLogs') {
          resolve({ success: true, logs: [] });
        } else {
          resolve({ success: true, message: 'Mock response OK' });
        }
      }, 400);
    });
  }
};

// Interface adapter untuk menyamakan callback lama
function runGAS(funcName, params, callback) {
  GASBridge.call(funcName, params).then((res) => {
    if (typeof callback === 'function') callback(res);
  });
}