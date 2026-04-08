# 📊 Drug Overdose Deaths Analysis & Visualization

A comprehensive data visualization project exploring opioid overdose death rates across Georgia counties, examining relationships with education levels and mental health infrastructure.

---

## 🎯 Live Demonstrations

### **M5: Interactive Poetry + Data Visualization** 
✨ **[View Final Project Here →](https://sumonkantidey.github.io/Overdose-Rate-Visualisation/M5/)**

An elegant interactive presentation combining poetry with four data visualizations:
- **Viz1:** Total opioid deaths over time periods (2010-2021)
- **Viz2:** Deaths per 100,000 by Economic Risk Status (ERS) groups with zoom controls
- **Viz3:** Mental health facilities vs. opioid mortality rates (bubble chart with zoom)
- **Viz4:** Side-by-side choropleth maps comparing education and opioid death rates

### M4 Version
[View M4 Demo](https://raw.githack.com/SumonKantiDey/Overdose-Rate-Visualisation/main/M4/index.html)

---

## 📁 Project Structure & Files

### Key Resources
- **EDA & Data Preprocessing:** `Data Preprocessing.ipynb`
- **Cleaned Dataset:** `data/clean_drug_overdose_death.csv`
- **M5 Visualization:** 
  - `M5/index.html` (main project)
  - `M5/main.js` - Interactive D3.js visualizations
  - `M5/styles.css` - Modern styling and responsive design

---

## 🚀 Setup & Installation

### Clone the Repository
```bash
git clone https://github.com/SumonKantiDey/Overdose-Rate-Visualisation.git
cd Overdose-Rate-Visualisation/
```

### Run Locally

**Using Python HTTP Server:**
```bash
python -m http.server 5500
```

**Using VS Code Live Server:**
1. Right-click on `M5/index.html`
2. Select "Open with Live Server"

Then open `http://localhost:5500/M5/` in your browser

---

## 🛠 Technology Stack

- **D3.js** - Interactive data visualization
- **TopoJSON** - Geospatial data (US counties)
- **HTML5/CSS3** - Responsive design
- **Python** - Data preprocessing & EDA
- **Jupyter Notebooks** - Data exploration

---

## 📈 Data Insights

- Analyzes **159 Georgia counties**
- Time periods: **2010-2021** (grouped into 3-year intervals)
- Metrics: Opioid death counts/rates, education levels, mental health facilities
- Data source: CDC Wonder Database & US Census Bureau

---

## 👥 Team

This project was created by:
- **Sumon Kanti Dey**
- **Dennis Sun**
- **Avery Mattoon**

**Course:** CS 441/541 - Information Visualization (Spring 2026)

---
