import React, { useState, useEffect } from 'react';

export default function App() {
  const [file, setFile] = useState(null);
  const [targetOs, setTargetOs] = useState('Astra Linux Special Edition 1.7');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [osProfiles, setOsProfiles] = useState([]);
  const [softwareStats, setSoftwareStats] = useState([]);
  const [view, setView] = useState('upload'); // upload, results, catalog

  useEffect(() => {
    // Загружаем список ОС
    fetch('http://localhost:8000/api/v1/catalog/os-profiles')
      .then(res => res.json())
      .then(setOsProfiles)
      .catch(console.error);

    // Загружаем статистику софта
    fetch('http://localhost:8000/api/v1/stats/software-categories')
      .then(res => res.json())
      .then(setSoftwareStats)
      .catch(console.error);
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_os', targetOs);

    try {
      const res = await fetch('http://localhost:8000/api/v1/audit/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`Ошибка загрузки: ${res.statusText}`);
      const json = await res.json();
      setData(json);
      setView('results');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A0D12 0%, #161D2B 100%)',
      color: '#E2E8F0'
    }}>
      {/* Header */}
      <header style={{
        background: '#0F131C',
        borderBottom: '1px solid #1E2636',
        padding: '1.5rem 2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#38BDF8',
              margin: 0,
              marginBottom: '0.25rem',
              letterSpacing: '-0.02em'
            }}>
              АЛРОСА ИТ — Аудит миграции
            </h1>
            <p style={{
              fontSize: '0.875rem',
              color: '#94A3B8',
              margin: 0
            }}>
              Оценка готовности рабочих мест к переходу на отечественное ПО
            </p>
          </div>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setView('upload')}
              style={{
                background: view === 'upload' ? '#38BDF8' : 'transparent',
                color: view === 'upload' ? '#0A0D12' : '#94A3B8',
                border: view === 'upload' ? 'none' : '1px solid #1E2636',
                padding: '0.5rem 1.25rem',
                borderRadius: '999px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
            >
              Аудит
            </button>
            <button
              onClick={() => setView('catalog')}
              style={{
                background: view === 'catalog' ? '#38BDF8' : 'transparent',
                color: view === 'catalog' ? '#0A0D12' : '#94A3B8',
                border: view === 'catalog' ? 'none' : '1px solid #1E2636',
                padding: '0.5rem 1.25rem',
                borderRadius: '999px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
            >
              База знаний
            </button>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {view === 'upload' && (
          <>
            {/* OS Profiles Info */}
            <div style={{
              background: '#0F131C',
              border: '1px solid #1E2636',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#E2E8F0' }}>
                Поддерживаемые ОС
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                {osProfiles.map(os => (
                  <div key={os.id} style={{
                    background: '#161D2B',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #1E2636'
                  }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#38BDF8', marginBottom: '0.5rem' }}>
                      {os.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span>RAM: {os.min_ram_gb} ГБ</span>
                      <span>CPU: {os.min_cpu_cores} ядра</span>
                      <span>Диск: {os.min_disk_gb} ГБ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Form */}
            <div style={{
              background: '#0F131C',
              border: '1px solid #1E2636',
              borderRadius: '12px',
              padding: '2rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#E2E8F0' }}>
                Загрузка реестра АРМ
              </h2>
              <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Файл реестра (.csv, .xlsx)
                    </label>
                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={(e) => setFile(e.target.files[0])}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#161D2B',
                        border: '1px solid #1E2636',
                        borderRadius: '8px',
                        color: '#E2E8F0',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Целевая ОС
                    </label>
                    <select
                      value={targetOs}
                      onChange={(e) => setTargetOs(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: '#161D2B',
                        border: '1px solid #1E2636',
                        borderRadius: '8px',
                        color: '#E2E8F0',
                        fontSize: '0.875rem'
                      }}
                    >
                      {osProfiles.map(os => (
                        <option key={os.id} value={os.name}>{os.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !file}
                  style={{
                    background: loading || !file ? '#1E2636' : '#38BDF8',
                    color: loading || !file ? '#64748B' : '#0A0D12',
                    border: 'none',
                    padding: '1rem 2rem',
                    borderRadius: '999px',
                    cursor: loading || !file ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '1rem',
                    transition: 'all 0.2s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  {loading ? 'Анализ инфраструктуры...' : 'Запустить аудит'}
                </button>
              </form>
              {error && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#FCA5A5',
                  fontSize: '0.875rem'
                }}>
                  {error}
                </div>
              )}
            </div>

            {/* Software Stats */}
            {softwareStats.length > 0 && (
              <div style={{
                marginTop: '2rem',
                background: '#0F131C',
                border: '1px solid #1E2636',
                borderRadius: '12px',
                padding: '1.5rem'
              }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: '#E2E8F0' }}>
                  База совместимости ПО
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {softwareStats.map(stat => (
                    <div key={stat.category} style={{
                      background: '#161D2B',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid #1E2636',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#38BDF8', marginBottom: '0.25rem' }}>
                        {stat.count}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>
                        {stat.category}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {view === 'results' && data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <StatCard label="Всего АРМ" value={data.summary.total} color="#38BDF8" bgColor="rgba(56, 189, 248, 0.1)" borderColor="rgba(56, 189, 248, 0.3)" />
              <StatCard label="Готовы к миграции" value={data.summary.ready} color="#6EE7B7" bgColor="rgba(110, 231, 183, 0.1)" borderColor="rgba(110, 231, 183, 0.3)" />
              <StatCard label="Требуется апгрейд" value={data.summary.upgrade_required} color="#E9A568" bgColor="rgba(233, 165, 104, 0.1)" borderColor="rgba(233, 165, 104, 0.3)" />
              <StatCard label="Блокирующий софт" value={data.summary.blocked} color="#F87171" bgColor="rgba(248, 113, 113, 0.1)" borderColor="rgba(248, 113, 113, 0.3)" />
            </div>

            {/* Waves */}
            <div style={{
              background: '#0F131C',
              border: '1px solid #1E2636',
              borderRadius: '12px',
              padding: '2rem'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: '#E2E8F0' }}>
                Группировка по волнам перехода
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <WaveCard title="Волна 1: Пилот" count={data.summary.waves.wave_1} description="100% совместимость, типовой офисный софт" color="#6EE7B7" />
                <WaveCard title="Волна 2: Основная" count={data.summary.waves.wave_2} description="После апгрейда RAM/CPU или замены веб-аналогами" color="#E9A568" />
                <WaveCard title="Волна 3: VDI / Изоляция" count={data.summary.waves.wave_3} description="Тяжелый софт (САПР, спец-ПО) через терминальный доступ" color="#F87171" />
              </div>
            </div>

            {/* Workstations Table */}
            <WorkstationsTable workstations={data.workstations} />
          </div>
        )}

        {view === 'catalog' && <CatalogView />}
      </main>
    </div>
  );
}

function StatCard({ label, value, color, bgColor, borderColor }) {
  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: '12px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }}>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.5rem', fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function WaveCard({ title, count, description, color }) {
  return (
    <div style={{
      background: '#161D2B',
      borderLeft: `4px solid ${color}`,
      borderRadius: '8px',
      padding: '1.5rem'
    }}>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700, color: '#94A3B8', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
        {title}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#E2E8F0', marginBottom: '0.5rem' }}>
        {count} АРМ
      </div>
      <div style={{ fontSize: '0.75rem', color: '#94A3B8', lineHeight: 1.5 }}>
        {description}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    ready: { bg: 'rgba(110, 231, 183, 0.2)', border: 'rgba(110, 231, 183, 0.4)', color: '#6EE7B7', text: 'Готов' },
    upgrade_required: { bg: 'rgba(233, 165, 104, 0.2)', border: 'rgba(233, 165, 104, 0.4)', color: '#E9A568', text: 'Апгрейд' },
    blocked: { bg: 'rgba(248, 113, 113, 0.2)', border: 'rgba(248, 113, 113, 0.4)', color: '#F87171', text: 'Блокер' }
  };
  const cfg = config[status] || config.ready;
  return (
    <span style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      color: cfg.color,
      padding: '0.25rem 0.75rem',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      display: 'inline-block'
    }}>
      {cfg.text}
    </span>
  );
}

function WorkstationsTable({ workstations }) {
  return (
    <div style={{
      background: '#0F131C',
      border: '1px solid #1E2636',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #1E2636' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#E2E8F0' }}>
          Детализация по рабочим местам
        </h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead style={{ background: '#161D2B' }}>
            <tr>
              {['Имя АРМ', 'Подразделение', 'Пользователь', 'Статус', 'Волна', 'Замечания / Блокеры'].map(header => (
                <th key={header} style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#94A3B8',
                  letterSpacing: '0.05em'
                }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workstations.map((ws) => (
              <tr key={ws.workstation_id} style={{
                borderTop: '1px solid #1E2636',
                transition: 'background 0.2s'
              }}>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#E2E8F0' }}>
                  {ws.workstation_id}
                </td>
                <td style={{ padding: '0.75rem 1rem', color: '#CBD5E1' }}>{ws.department}</td>
                <td style={{ padding: '0.75rem 1rem', color: '#94A3B8' }}>{ws.user_fullname || '—'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <StatusBadge status={ws.status} />
                </td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#E2E8F0' }}>{ws.wave}</td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.75rem' }}>
                  {ws.hardware_issues.map((i, idx) => (
                    <div key={idx} style={{ color: '#E9A568', marginBottom: '0.25rem' }}>{i}</div>
                  ))}
                  {ws.blocking_software.map((s, idx) => (
                    <div key={idx} style={{ color: '#F87171', marginBottom: '0.25rem' }}>{s}</div>
                  ))}
                  {ws.hardware_issues.length === 0 && ws.blocking_software.length === 0 && (
                    <span style={{ color: '#64748B' }}>Замечаний нет</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CatalogView() {
  const [compatibility, setCompatibility] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/catalog/compatibility')
      .then(res => res.json())
      .then(setCompatibility)
      .catch(console.error);
  }, []);

  const categories = ['all', ...new Set(compatibility.map(c => c.category))];
  const filtered = filter === 'all' ? compatibility : compatibility.filter(c => c.category === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{
        background: '#0F131C',
        border: '1px solid #1E2636',
        borderRadius: '12px',
        padding: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: '#E2E8F0' }}>
          Матрица совместимости ПО
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                background: filter === cat ? '#38BDF8' : '#161D2B',
                color: filter === cat ? '#0A0D12' : '#94A3B8',
                border: '1px solid #1E2636',
                padding: '0.5rem 1rem',
                borderRadius: '999px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                transition: 'all 0.2s'
              }}
            >
              {cat === 'all' ? 'Все' : cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: '#0F131C',
        border: '1px solid #1E2636',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead style={{ background: '#161D2B' }}>
              <tr>
                {['ПО', 'Категория', 'Целевая ОС', 'Статус', 'Отечественный аналог', 'Комментарий'].map(header => (
                  <th key={header} style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#94A3B8',
                    letterSpacing: '0.05em'
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid #1E2636' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#E2E8F0' }}>{item.software_name}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#94A3B8', fontSize: '0.75rem' }}>{item.category}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#38BDF8', fontSize: '0.75rem' }}>{item.target_os}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      background: item.is_blocker ? 'rgba(248, 113, 113, 0.2)' : 'rgba(110, 231, 183, 0.2)',
                      border: item.is_blocker ? '1px solid rgba(248, 113, 113, 0.4)' : '1px solid rgba(110, 231, 183, 0.4)',
                      color: item.is_blocker ? '#F87171' : '#6EE7B7',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      {item.is_blocker ? 'Блокер' : item.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#CBD5E1' }}>{item.domestic_alternative}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#94A3B8', fontSize: '0.75rem' }}>{item.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
