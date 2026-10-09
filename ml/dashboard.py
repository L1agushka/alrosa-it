import json
import joblib
import pandas as pd
import streamlit as st
import plotly.express as px

st.set_page_config(page_title="АЛРОСА-ИТ | ML Risk Dashboard", page_icon="🛡️", layout="wide")

@st.cache_resource
def load_artifacts():
    model = joblib.load("ml/models/random_forest.joblib")
    with open("ml/models/meta.json", "r", encoding="utf-8") as f:
        meta = json.load(f)
    return model, meta

try:
    model, meta = load_artifacts()
except Exception as e:
    st.error(f"Ошибка загрузки модели: {e}")
    st.stop()

st.title("🛡️ Предиктивный скоринг рисков миграции (Random Forest)")
st.caption("Интеллектуальная оценка вероятности инцидентов при переходе парка на Astra Linux")

tabs = st.tabs(["📊 Анализ парка (Пакетный)", "🎯 Калькулятор одного АРМ", "⚙️ Метрики и веса модели"])

# ВКЛАДКА 1: ПАКЕТНЫЙ АНАЛИЗ ФАЙЛА
with tabs[0]:
    st.subheader("Пакетный скоринг рабочих мест из инвентаризации")
    
    col_upload, col_btn = st.columns([3, 1])
    uploaded = col_upload.file_uploader("Загрузить CSV-файл аудита", type=["csv"])
    
    use_sample = False
    if not uploaded:
        if col_btn.button("Использовать 100 АРМ (тестовый реестр)"):
            use_sample = True

    df_raw = None
    if uploaded:
        df_raw = pd.read_csv(uploaded)
    elif use_sample or "alrosa_audit_100_workstations.csv" in st.session_state:
        st.session_state["alrosa_audit_100_workstations.csv"] = True
        try:
            df_raw = pd.read_csv("alrosa_audit_100_workstations.csv")
        except Exception:
            df_raw = pd.read_csv("ml/data/migration_dataset.csv").head(100)

    if df_raw is not None:
        # Приведение полей инвентаризации к признакам модели
        rows = []
        for _, r in df_raw.iterrows():
            dept = str(r.get("department", "Прочее"))
            sw = str(r.get("installed_software", "")).lower()
            ram = int(r.get("ram_gb", 8) or 8)
            cpu = int(r.get("cpu_cores", 4) or 4)
            disk = int(r.get("disk_gb", 256) or 256)
            
            has_crypto = int(any(k in sw for k in ["крипто", "crypto", "rutoken", "эцп", "csp"]))
            has_cad = int(any(k in sw for k in ["cad", "компас", "autocad", "revit"]))
            has_1c = int("1c" in sw or "1с" in sw)
            
            apps_count = len(sw.split(";")) if ";" in sw else int(r.get("installed_apps_count", 6))
            unsupported = int(r.get("unsupported_apps_count", 1 if ("autocad" in sw or "photoshop" in sw) else 0))

            rows.append({
                "workstation_id": r.get("workstation_id", r.get("workstation_ext_id", f"WS-{_}")),
                "department": dept,
                "ram_gb": ram,
                "cpu_cores": cpu,
                "disk_gb": disk,
                "installed_apps_count": max(apps_count, 3),
                "unsupported_apps_count": unsupported,
                "has_crypto_tools": has_crypto,
                "has_cad_software": has_cad,
                "has_thick_1c": has_1c,
                "peripherals_count": int(r.get("peripherals_count", 2)),
            })
            
        scoring_df = pd.DataFrame(rows)
        feature_cols = [
            "department", "ram_gb", "cpu_cores", "disk_gb",
            "installed_apps_count", "unsupported_apps_count",
            "has_crypto_tools", "has_cad_software", "has_thick_1c",
            "peripherals_count"
        ]
        
        probas = model.predict_proba(scoring_df[feature_cols])[:, 1]
        scoring_df["Вероятность инцидента (%)"] = (probas * 100).round(1)
        
        def assign_level(p):
            if p >= 60: return "Высокий"
            if p >= 35: return "Умеренный"
            return "Низкий"
            
        scoring_df["Уровень риска"] = scoring_df["Вероятность инцидента (%)"].apply(assign_level)

        # Сводные метрики
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Всего рабочих мест", len(scoring_df))
        m2.metric("Низкий риск (Волна 1)", len(scoring_df[scoring_df["Уровень риска"] == "Низкий"]))
        m3.metric("Умеренный (Волна 2)", len(scoring_df[scoring_df["Уровень риска"] == "Умеренный"]))
        m4.metric("Высокий риск (Индивидуально)", len(scoring_df[scoring_df["Уровень риска"] == "Высокий"]))

        c_pie, c_bar = st.columns(2)
        with c_pie:
            pie_fig = px.pie(
                scoring_df, names="Уровень риска",
                title="Распределение парка по категориям риска",
                color="Уровень риска",
                color_discrete_map={"Низкий": "#10b981", "Умеренный": "#f59e0b", "Высокий": "#ef4444"}
            )
            st.plotly_chart(pie_fig, use_container_width=True)
            
        with c_bar:
            dept_risk = scoring_df.groupby("department")["Вероятность инцидента (%)"].mean().reset_index()
            bar_fig = px.bar(
                dept_risk, x="Вероятность инцидента (%)", y="department", orientation="h",
                title="Средний риск по подразделениям", color="Вероятность инцидента (%)",
                color_continuous_scale="Reds"
            )
            st.plotly_chart(bar_fig, use_container_width=True)

        st.subheader("Реестр рабочих мест с оценкой модели")
        st.dataframe(
            scoring_df[["workstation_id", "department", "ram_gb", "disk_gb", "Уровень риска", "Вероятность инцидента (%)"]],
            use_container_width=True, hide_index=True
        )

# ВКЛАДКА 2: КАЛЬКУЛЯТОР ОДНОГО АРМ
with tabs[1]:
    st.subheader("Индивидуальная оценка конкретной конфигурации")
    with st.form("single_form"):
        c1, c2, c3 = st.columns(3)
        with c1:
            dept = st.selectbox("Подразделение", [
                "Бухгалтерия и финансовый контроль", "Служба главного механика",
                "Управление информационных технологий", "Юридический департамент",
                "Отдел кадров и делопроизводства", "Геологоразведочная партия",
                "Логистика и материально-техническое снабжение"
            ])
            ram = st.select_slider("ОЗУ (ГБ)", [4, 8, 16, 32], value=8)
            cpu = st.slider("Ядра CPU", 2, 16, 4)
        with c2:
            disk = st.select_slider("Диск (ГБ)", [64, 120, 240, 500, 1024], value=240)
            apps = st.slider("Всего приложений", 2, 25, 6)
            unsupp = st.slider("ПО без аналогов", 0, 8, 0)
        with c3:
            crypto = st.checkbox("СКЗИ / ЭЦП (КриптоПро)")
            cad = st.checkbox("САПР (AutoCAD / Компас)")
            thick_1c = st.checkbox("Толстый клиент 1С")
            periph = st.slider("Периферия", 1, 5, 2)
        
        calc_btn = st.form_submit_button("Рассчитать риск")

    if calc_btn:
        row = pd.DataFrame([{
            "department": dept, "ram_gb": ram, "cpu_cores": cpu, "disk_gb": disk,
            "installed_apps_count": apps, "unsupported_apps_count": unsupp,
            "has_crypto_tools": int(crypto), "has_cad_software": int(cad),
            "has_thick_1c": int(thick_1c), "peripherals_count": periph
        }])
        prob = model.predict_proba(row)[0][1] * 100
        
        if prob >= 60:
            st.error(f"### Высокий риск: {prob:.1f}% — требуется пилотная отладка")
        elif prob >= 35:
            st.warning(f"### Умеренный риск: {prob:.1f}% — перевод во 2-й волне")
        else:
            st.success(f"### Низкий риск: {prob:.1f}% — готов к переводу в 1-й волне")

# ВКЛАДКА 3: МЕТРИКИ И ВЕСА
with tabs[2]:
    st.subheader("Метрики качества и важность признаков (Explainable AI)")
    m = meta.get("metrics", {})
    mc1, mc2, mc3 = st.columns(3)
    mc1.metric("ROC-AUC", f"{m.get('roc_auc', 0):.3f}")
    mc2.metric("F1-Score", f"{m.get('f1_score', 0):.3f}")
    mc3.metric("Accuracy", f"{m.get('accuracy', 0):.3f}")
    
    fi = pd.DataFrame(meta.get("feature_importances", []))
    st.plotly_chart(
        px.bar(fi.sort_values(by="weight_pct"), x="weight_pct", y="feature", orientation="h",
               title="Вклад факторов в предсказание (%)", color="weight_pct", color_continuous_scale="Teal"),
        use_container_width=True
    )
