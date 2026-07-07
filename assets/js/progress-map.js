/**
 * KouTech 進捗マップ
 *
 * 科目内の全単元を，動画番号順につながったノードとして表示し，
 * 単元をまたいだ科目全体の学習の進み具合を可視化します。
 * 動画同士の「関連」は，現状は course_data_index.json の単元の並び順
 * と各単元内の video_number 順から自動的に一本道として構築しています。
 */
class ProgressMap {
  constructor() {
    this.elements = {
      tabsContainer: document.getElementById('subject-tabs'),
      mapContainer: document.getElementById('progress-map-container'),
      summary: document.getElementById('progress-summary')
    };

    this.STORAGE_KEY = 'koutech-progress-map-last-subject';
    this.NODE_RADIUS = 11;
    this.NODE_SPACING = 34;
    this.ROW_HEIGHT = 56;

    this.indexData = null;
    this.currentSubject = null;

    this.init();
  }

  init() {
    fetch('course_data_index.json')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        this.indexData = data;
        this.renderSubjectTabs();

        const urlParams = new URLSearchParams(window.location.search);
        const subjectParam = urlParams.get('subject');
        const savedSubject = this.getSavedSubject();
        const subjectExists = (name) => data.subjects.some(s => s.subject_name === name);

        const initialSubject =
          (subjectParam && subjectExists(subjectParam)) ? subjectParam :
          (savedSubject && subjectExists(savedSubject)) ? savedSubject :
          data.subjects[0].subject_name;

        this.selectSubject(initialSubject);
      })
      .catch(error => {
        console.error('Error loading course data index:', error);
        if (this.elements.mapContainer) {
          this.elements.mapContainer.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-sub);">読み込みに失敗しました</div>';
        }
      });
  }

  getSavedSubject() {
    try {
      return localStorage.getItem(this.STORAGE_KEY);
    } catch (_e) {
      return null;
    }
  }

  saveSubject(subjectName) {
    try {
      localStorage.setItem(this.STORAGE_KEY, subjectName);
    } catch (_e) { /* localStorage 無効時は無視 */ }
  }

  getSubjectColor(subjectName) {
    const map = {
      '数Ⅰ': 'var(--subject-math1-base)',
      '数Ⅱ': 'var(--subject-math2-base)',
      '数Ⅲ': 'var(--subject-math3-base)',
      '数A': 'var(--subject-mathA-base)',
      '数B': 'var(--subject-mathB-base)',
      '数C': 'var(--subject-mathC-base)'
    };
    return map[subjectName] || 'var(--subject-math1-base)';
  }

  renderSubjectTabs() {
    const tabsDiv = document.createElement('div');
    tabsDiv.className = 'tabs';

    this.indexData.subjects.forEach(subject => {
      const btn = document.createElement('button');
      btn.className = 'tab';
      btn.textContent = subject.subject_name;
      btn.dataset.subject = subject.subject_name;
      btn.addEventListener('click', () => this.selectSubject(subject.subject_name));
      tabsDiv.appendChild(btn);
    });

    this.elements.tabsContainer.innerHTML = '';
    this.elements.tabsContainer.appendChild(tabsDiv);
  }

  updateActiveTab() {
    this.elements.tabsContainer.querySelectorAll('.tab').forEach(tab => {
      const isActive = tab.dataset.subject === this.currentSubject;
      tab.classList.toggle('active', isActive);
      tab.style.borderBottomColor = isActive ? this.getSubjectColor(tab.dataset.subject) : 'transparent';
    });
  }

  selectSubject(subjectName) {
    this.currentSubject = subjectName;
    this.saveSubject(subjectName);
    this.updateActiveTab();

    const newUrl = `${window.location.pathname}?subject=${encodeURIComponent(subjectName)}`;
    window.history.replaceState({}, '', newUrl);

    this.elements.mapContainer.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-sub);">読み込み中...</div>';

    const subject = this.indexData.subjects.find(s => s.subject_name === subjectName);
    if (!subject) return;

    Promise.all(subject.units.map(unit =>
      fetch(unit.file_path)
        .then(res => res.ok ? res.json() : { videos: [] })
        .then(data => ({ unit_name: unit.unit_name, videos: data.videos || [] }))
    )).then(units => {
      this.renderMap(subjectName, units);
    }).catch(error => {
      console.error('Error loading unit data:', error);
      this.elements.mapContainer.innerHTML = '<div style="padding:2rem; text-align:center; color:var(--text-sub);">読み込みに失敗しました</div>';
    });
  }

  renderMap(subjectName, units) {
    const color = this.getSubjectColor(subjectName);
    const ProgressStore = window.KouTech.ProgressStore;
    let totalCompleted = 0;
    let totalCount = 0;

    const rowsHtml = units.map(unit => {
      const stats = ProgressStore.getUnitStats(subjectName, unit.unit_name, unit.videos.length);
      totalCompleted += stats.completed;
      totalCount += stats.total;

      const svgWidth = Math.max(unit.videos.length * this.NODE_SPACING + this.NODE_RADIUS * 2, 100);
      const svgHeight = this.ROW_HEIGHT;
      const cy = svgHeight / 2;

      let linesHtml = '';
      let nodesHtml = '';

      unit.videos.forEach((video, idx) => {
        const cx = this.NODE_RADIUS * 2 + idx * this.NODE_SPACING;

        if (idx > 0) {
          const prevCx = this.NODE_RADIUS * 2 + (idx - 1) * this.NODE_SPACING;
          linesHtml += `<line x1="${prevCx}" y1="${cy}" x2="${cx}" y2="${cy}" class="progress-map-edge" />`;
        }

        const entry = ProgressStore.get(subjectName, unit.unit_name, video.video_number);
        const completed = !!(entry && entry.completed);
        const inProgress = !completed && !!(entry && entry.position > 0);
        const fill = completed ? color : 'transparent';
        const stroke = (completed || inProgress) ? color : 'rgba(255,255,255,0.3)';

        nodesHtml += `
          <circle class="progress-map-node" data-subject="${escapeAttr(subjectName)}" data-unit="${escapeAttr(unit.unit_name)}" data-video="${video.video_number}"
            cx="${cx}" cy="${cy}" r="${this.NODE_RADIUS}" fill="${fill}" stroke="${stroke}" stroke-width="2.5">
            <title>${escapeAttr(video.title)}</title>
          </circle>`;
      });

      const percent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

      return `
        <div class="progress-map-unit-row">
          <div class="progress-map-unit-header">
            <span class="progress-map-unit-name">${unit.unit_name}</span>
            <span class="progress-map-unit-stats">${stats.completed}/${stats.total}</span>
            <div class="progress-map-unit-bar"><div class="progress-map-unit-bar-fill" style="width:${percent}%; background:${color}"></div></div>
          </div>
          <div class="progress-map-row-scroll">
            <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
              ${linesHtml}
              ${nodesHtml}
            </svg>
          </div>
        </div>
        <div class="progress-map-connector">↓</div>
      `;
    }).join('');

    const overallPercent = totalCount > 0 ? Math.round((totalCompleted / totalCount) * 100) : 0;
    this.elements.summary.innerHTML = `
      <div class="progress-map-summary-text">${subjectName} 全体の進捗: ${totalCompleted} / ${totalCount} 本 (${overallPercent}%)</div>
      <div class="progress-map-summary-bar"><div class="progress-map-summary-bar-fill" style="width:${overallPercent}%; background:${color}"></div></div>
    `;

    this.elements.mapContainer.innerHTML = rowsHtml;

    // 最終単元の後ろの矢印は不要なので削除
    const connectors = this.elements.mapContainer.querySelectorAll('.progress-map-connector');
    if (connectors.length > 0) connectors[connectors.length - 1].remove();

    // ノードクリックで該当動画のプレーヤーへ遷移
    this.elements.mapContainer.querySelectorAll('.progress-map-node').forEach(node => {
      node.addEventListener('click', () => {
        const { subject, unit, video } = node.dataset;
        window.location.href = `player.html?subject=${encodeURIComponent(subject)}&unit=${encodeURIComponent(unit)}&video=${video}`;
      });
    });
  }
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

window.KouTech = window.KouTech || {};
window.KouTech.ProgressMap = ProgressMap;

document.addEventListener('DOMContentLoaded', () => {
  new ProgressMap();
});
