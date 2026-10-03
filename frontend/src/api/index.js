// frontend/src/api/index.js

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Вспомогательная функция для обработки ответов
 */
async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Ошибка сервера: ${response.statusText}`);
  }
  return response.json();
}

export const auditApi = {
  /**
   * Проверка доступности бэкенда
   */
  async checkHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  /**
   * Получить список доступных целевых ОС и их минимальные требования
   * Ответ: Array<{ id, name, min_ram_gb, min_cpu_cores, min_disk_gb }>
   */
  async getOsProfiles() {
    const res = await fetch(`${API_BASE}/api/v1/catalog/os-profiles`);
    return handleResponse(res);
  },

  /**
   * Получить справочник ПО (опционально с фильтром по категории)
   * @param {string} [category] - e.g. "Офисный пакет", "САПР"
   */
  async getSoftwareCatalog(category = null) {
    const url = new URL(`${API_BASE}/api/v1/catalog/software`);
    if (category) url.searchParams.append('category', category);
    const res = await fetch(url);
    return handleResponse(res);
  },

  /**
   * Получить матрицу совместимости ПО с целевыми ОС
   * @param {number} [targetOsId] - ID целевой ОС для фильтрации
   */
  async getCompatibilityMatrix(targetOsId = null) {
    const url = new URL(`${API_BASE}/api/v1/catalog/compatibility`);
    if (targetOsId) url.searchParams.append('target_os_id', targetOsId);
    const res = await fetch(url);
    return handleResponse(res);
  },

  /**
   * Получить статистику по категориям программ в базе
   * Ответ: Array<{ category: string, count: number }>
   */
  async getSoftwareStats() {
    const res = await fetch(`${API_BASE}/api/v1/stats/software-categories`);
    return handleResponse(res);
  },

  /**
   * Получить список блокирующего ПО для конкретной ОС
   * @param {string} targetOsName - Название ОС (например, "Astra Linux Special Edition 1.7")
   */
  async getBlockerStats(targetOsName) {
    const url = new URL(`${API_BASE}/api/v1/stats/blockers`);
    if (targetOsName) url.searchParams.append('target_os_name', targetOsName);
    const res = await fetch(url);
    return handleResponse(res);
  },

  /**
   * Загрузить файл реестра (CSV/Excel) и запустить скоринг
   * @param {File} file - Файл с рабочего стола
   * @param {string} targetOs - Выбранная целевая ОС
   */
  async uploadAuditFile(file, targetOs) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_os', targetOs);

    const res = await fetch(`${API_BASE}/api/v1/audit/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  /**
   * Получить историю всех ранее проведённых аудитов (снапшотов)
   */
  async getAuditHistory() {
    const res = await fetch(`${API_BASE}/api/v1/audit/history`);
    return handleResponse(res);
  }
};
