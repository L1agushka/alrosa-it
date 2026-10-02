import React, { useState, useEffect } from 'react';

export default function App() {
  const [file, setFile] = useState(null);
  const [targetOs, setTargetOs] = useState('Astra Linux Special Edition 1.7');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [osProfiles, setOsProfiles] = useState([]);
  const [softwareStats, setSoftwareStats] = useState([]);
  const [view, setView] = useState('upload');

  useEffect(() => {
    fetch('http://localhost:8000/api/v1/catalog/os-profiles')
      .then(res => res.json())
      .then(setOsProfiles)
      .catch(console.error);

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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Shapes */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        zIndex: 0
      }}>
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'float 20s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-15%',
          left: '-10%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          animation: 'float 25s ease-in-out infinite reverse'
        }} />
        <style>{`
          @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(50px, 50px) scale(1.1); }
          }
        `}</style>
      </div>

      {/* Header */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        padding: '1.5rem 2rem',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}>
              💎
            </div>
            <div>
              <h1 style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                margin: 0,
                marginBottom: '0.25rem',
                letterSpacing: '-0.02em'
              }}>
                АЛРОСА ИТ — Аудит миграции
              </h1>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748B',
                margin: 0
              }}>
                Оценка готовности рабочих мест к переходу на отечественное ПО
              </p>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setView('upload')}
              style={{
                background: view === 'upload' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                color: view === 'upload' ? 'white' : '#64748B',
                border: '2px solid',
                borderColor: view === 'upload' ? 'transparent' : '#E2E8F0',
                padding: '0.625rem 1.5rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                transition: 'all 0.3s',
                boxShadow: view === 'upload' ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (view !== 'upload') {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.color = '#667eea';
                }
              }}
              onMouseLeave={(e) => {
                if (view !== 'upload') {
                  e.target.style.borderColor = '#E2E8F0';
                  e.target.style.color = '#64748B';
                }
              }}
            >
              📊 Аудит
            </button>
            <button
              onClick={() => setView('catalog')}
              style={{
                background: view === 'catalog' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                color: view === 'catalog' ? 'white' : '#64748B',
                border: '2px solid',
                borderColor: view === 'catalog' ? 'transparent' : '#E2E8F0',
                padding: '0.625rem 1.5rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
                transition: 'all 0.3s',
                boxShadow: view === 'catalog' ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (view !== 'catalog') {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.color = '#667eea';
                }
              }}
              onMouseLeave={(e) => {
                if (view !== 'catalog') {
                  e.target.style.borderColor = '#E2E8F0';
                  e.target.style.color = '#64748B';
                }
              }}
            >
              📚 База знаний
            </button>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem', position: 'relative', zIndex: 1 }}>
        {view === 'upload' && (
          <>
            {/* OS Profiles Info */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '2rem',
              marginBottom: '2rem',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🖥️</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                  Поддерживаемые операционные системы
                </h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {osProfiles.map((os, idx) => (
                  <div key={os.id} style={{
                    background: `linear-gradient(135deg, ${['#667eea', '#f093fb', '#4facfe', '#00f2fe'][idx % 4]} 0%, ${['#764ba2', '#f5576c', '#00f2fe', '#43e97b'][idx % 4]} 100%)`,
                    padding: '1.5rem',
                    borderRadius: '16px',
                    color: 'white',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
                  }}
                  >
                    <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', lineHeight: 1.3 }}>
                      {os.name}
                    </div>
                    <div style={{ fontSize: '0.813rem', opacity: 0.95, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🧠</span>
                        <span>RAM: {os.min_ram_gb} ГБ</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>⚡</span>
                        <span>CPU: {os.min_cpu_cores} ядра</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>💾</span>
                        <span>Диск: {os.min_disk_gb} ГБ</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Form */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '20px',
              padding: '2.5rem',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📁</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                  Загрузка реестра АРМ
                </h2>
              </div>
              <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: '0.75rem'
                    }}>
                      <span>📄</span>
                      <span>Файл реестра (.csv, .xlsx)</span>
                    </label>
                    <div style={{
                      position: 'relative',
                      border: '2px dashed #cbd5e1',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      textAlign: 'center',
                      background: '#f8fafc',
                      transition: 'all 0.3s',
                      cursor: 'pointer'
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = '#667eea';
                      e.currentTarget.style.background = '#f0f4ff';
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.background = '#f8fafc';
                      if (e.dataTransfer.files[0]) {
                        setFile(e.dataTransfer.files[0]);
                      }
                    }}
                    >
                      <input
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={(e) => setFile(e.target.files[0])}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'pointer'
                        }}
                      />
                      {file ? (
                        <div style={{ color: '#667eea', fontWeight: 600 }}>
                          ✅ {file.name}
                        </div>
                      ) : (
                        <div style={{ color: '#64748b' }}>
                          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⬆️</div>
                          <div style={{ fontSize: '0.875rem' }}>Перетащите файл или нажмите для выбора</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#475569',
                      marginBottom: '0.75rem'
                    }}>
                      <span>🎯</span>
                      <span>Целевая операционная система</span>
                    </label>
                    <select
                      value={targetOs}
                      onChange={(e) => setTargetOs(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        background: 'white',
                        border: '2px solid #e2e8f0',
                        borderRadius: '12px',
                        color: '#1e293b',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#667eea'}
                      onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
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
                    background: loading || !file ? '#cbd5e1' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '1.25rem 2.5rem',
                    borderRadius: '12px',
                    cursor: loading || !file ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    transition: 'all 0.3s',
                    boxShadow: loading || !file ? 'none' : '0 10px 30px rgba(102, 126, 234, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    margin: '0 auto',
                    minWidth: '300px'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && file) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = loading || !file ? 'none' : '0 10px 30px rgba(102, 126, 234, 0.4)';
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{
                        display: 'inline-block',
                        width: '20px',
                        height: '20px',
                        border: '3px solid rgba(255,255,255,0.3)',
                        borderTop: '3px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      <span>Анализ инфраструктуры...</span>
                      <style>{`
                        @keyframes spin {
                          to { transform: rotate(360deg); }
                        }
                      `}</style>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Запустить аудит</span>
                    </>
                  )}
                </button>
              </form>
              {error && (
                <div style={{
                  marginTop: '1.5rem',
                  padding: '1rem 1.5rem',
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  boxShadow: '0 8px 20px rgba(255, 107, 107, 0.3)'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Software Stats */}
            {softwareStats.length > 0 && (
              <div style={{
                marginTop: '2rem',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px',
                padding: '2rem',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>📦</span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
                    База совместимости ПО
                  </h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  {softwareStats.map((stat, idx) => (
                    <div key={stat.category} style={{
                      background: 'white',
                      padding: '1.5rem',
                      borderRadius: '16px',
                      textAlign: 'center',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
                      border: '2px solid',
                      borderColor: ['#667eea', '#f093fb', '#4facfe', '#00f2fe', '#43e97b'][idx % 5],
                      transition: 'transform 0.3s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <div style={{
                        fontSize: '2.5rem',
                        fontWeight: 800,
                        background: `linear-gradient(135deg, ${['#667eea', '#f093fb', '#4facfe', '#00f2fe', '#43e97b'][idx % 5]} 0%, ${['#764ba2', '#f5576c', '#00f2fe', '#43e97b', '#fa709a'][idx % 5]} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '0.5rem'
                      }}>
                        {stat.count}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {stat.category}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {view === 'results' && data && <ResultsView data={data} />}
        {view === 'catalog' && <CatalogView />}
      </main>
    </div>
  );
}

function ResultsView({ data }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <StatCard
          icon="📊"
          label="Всего АРМ"
          value={data.summary.total}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
        <StatCard
          icon="✅"
          label="Готовы к миграции"
          value={data.summary.ready}
          gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
        />
        <StatCard
          icon="⚡"
          label="Требуется апгрейд"
          value={data.summary.upgrade_required}
          gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
        />
        <StatCard
          icon="🚫"
          label="Блокирующий софт"
          value={data.summary.blocked}
          gradient="linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
        />
      </div>

      {/* Waves */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '2.5rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🌊</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
            Группировка по волнам перехода
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <WaveCard
            icon="🎯"
            title="Волна 1: Пилот"
            count={data.summary.waves.wave_1}
            description="100% совместимость, типовой офисный софт"
            gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
          />
          <WaveCard
            icon="⚙️"
            title="Волна 2: Основная"
            count={data.summary.waves.wave_2}
            description="После апгрейда RAM/CPU или замены веб-аналогами"
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
          />
          <WaveCard
            icon="🖥️"
            title="Волна 3: VDI / Изоляция"
            count={data.summary.waves.wave_3}
            description="Тяжелый софт (САПР, спец-ПО) через терминальный доступ"
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          />
        </div>
      </div>

      {/* Workstations Table */}
      <WorkstationsTable workstations={data.workstations} />
    </div>
  );
}

function StatCard({ icon, label, value, gradient }) {
  return (
    <div style={{
      background: gradient,
      borderRadius: '20px',
      padding: '2rem',
      color: 'white',
      boxShadow: '0 15px 40px rgba(0, 0, 0, 0.2)',
      transition: 'transform 0.3s, box-shadow 0.3s',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-8px)';
      e.currentTarget.style.boxShadow = '0 20px 50px rgba(0, 0, 0, 0.3)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.2)';
    }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{icon}</div>
      <div style={{ fontSize: '0.875rem', opacity: 0.9, fontWeight: 600, marginBottom: '0.75rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function WaveCard({ icon, title, count, description, gradient }) {
  return (
    <div style={{
      background: 'white',
      border: '3px solid transparent',
      backgroundImage: `${gradient}, white`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box, border-box',
      borderRadius: '20px',
      padding: '2rem',
      transition: 'transform 0.3s, box-shadow 0.3s',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-5px)';
      e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{icon}</div>
      <div style={{
        fontSize: '0.875rem',
        fontWeight: 700,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '0.75rem'
      }}>
        {title}
      </div>
      <div style={{
        fontSize: '2.5rem',
        fontWeight: 800,
        background: gradient,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '1rem'
      }}>
        {count} АРМ
      </div>
      <div style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
        {description}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    ready: { gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', icon: '✅', text: 'Готов' },
    upgrade_required: { gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', icon: '⚡', text: 'Апгрейд' },
    blocked: { gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', icon: '🚫', text: 'Блокер' }
  };
  const cfg = config[status] || config.ready;
  return (
    <span style={{
      background: cfg.gradient,
      color: 'white',
      padding: '0.5rem 1rem',
      borderRadius: '12px',
      fontSize: '0.813rem',
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }}>
      <span>{cfg.icon}</span>
      <span>{cfg.text}</span>
    </span>
  );
}

function WorkstationsTable({ workstations }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
      border: '1px solid rgba(255, 255, 255, 0.3)'
    }}>
      <div style={{ padding: '2rem', borderBottom: '2px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>📋</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
            Детализация по рабочим местам
          </h2>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
            <tr>
              {['🏷️ Имя АРМ', '🏢 Подразделение', '👤 Пользователь', '📊 Статус', '🌊 Волна', '📝 Замечания'].map(header => (
                <th key={header} style={{
                  padding: '1rem 1.5rem',
                  textAlign: 'left',
                  fontSize: '0.813rem',
                  fontWeight: 700,
                  color: '#475569'
                }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workstations.map((ws, idx) => (
              <tr key={ws.workstation_id} style={{
                borderTop: '1px solid #f1f5f9',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '1rem 1.5rem', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
                  {ws.workstation_id}
                </td>
                <td style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 500 }}>{ws.department}</td>
                <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>{ws.user_fullname || '—'}</td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <StatusBadge status={ws.status} />
                </td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: '0.375rem 0.875rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.875rem'
                  }}>
                    {ws.wave}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem', fontSize: '0.813rem' }}>
                  {ws.hardware_issues.map((i, idx) => (
                    <div key={idx} style={{
                      color: '#0ea5e9',
                      marginBottom: '0.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span>⚡</span>
                      <span>{i}</span>
                    </div>
                  ))}
                  {ws.blocking_software.map((s, idx) => (
                    <div key={idx} style={{
                      color: '#f43f5e',
                      marginBottom: '0.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span>🚫</span>
                      <span>{s}</span>
                    </div>
                  ))}
                  {ws.hardware_issues.length === 0 && ws.blocking_software.length === 0 && (
                    <span style={{
                      color: '#10b981',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span>✅</span>
                      <span>Замечаний нет</span>
                    </span>
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

  const categoryIcons = {
    'all': '📦',
    'Офисный пакет': '📄',
    'Браузер': '🌐',
    'Учётные системы': '💼',
    'САПР': '📐',
    'Графика': '🎨',
    'Коммуникации': '💬',
    'Информационная безопасность': '🔒',
    'Утилиты': '🔧',
    'Email': '📧',
    'Медиа': '🎬',
    'Разработка': '💻',
    'Базы данных': '🗄️',
    'Удалённый доступ': '🖥️',
    'PDF': '📑'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '2rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🗂️</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
            Матрица совместимости ПО
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {categories.map((cat, idx) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                background: filter === cat ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                color: filter === cat ? 'white' : '#64748b',
                border: '2px solid',
                borderColor: filter === cat ? 'transparent' : '#e2e8f0',
                padding: '0.75rem 1.5rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
                transition: 'all 0.3s',
                boxShadow: filter === cat ? '0 8px 20px rgba(102, 126, 234, 0.4)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                if (filter !== cat) {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== cat) {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              <span>{categoryIcons[cat] || '📦'}</span>
              <span>{cat === 'all' ? 'Все категории' : cat}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
              <tr>
                {['💻 ПО', '📁 Категория', '🖥️ Целевая ОС', '📊 Статус', '🇷🇺 Аналог', '📝 Комментарий'].map(header => (
                  <th key={header} style={{
                    padding: '1rem 1.5rem',
                    textAlign: 'left',
                    fontSize: '0.813rem',
                    fontWeight: 700,
                    color: '#475569'
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={idx} style={{
                  borderTop: '1px solid #f1f5f9',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#1e293b' }}>{item.software_name}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{
                      background: '#f1f5f9',
                      color: '#64748b',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.813rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem'
                    }}>
                      <span>{categoryIcons[item.category] || '📦'}</span>
                      <span>{item.category}</span>
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{
                      color: '#667eea',
                      fontWeight: 600,
                      fontSize: '0.813rem'
                    }}>
                      {item.target_os}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{
                      background: item.is_blocker
                        ? 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
                        : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                      color: 'white',
                      padding: '0.375rem 0.875rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}>
                      <span>{item.is_blocker ? '🚫' : '✅'}</span>
                      <span>{item.is_blocker ? 'Блокер' : item.status}</span>
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 500 }}>{item.domestic_alternative}</td>
                  <td style={{ padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.813rem', lineHeight: 1.5 }}>{item.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
