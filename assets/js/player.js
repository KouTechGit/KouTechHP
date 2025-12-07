/**
 * KouTech Video Player Logic (Unified Course Data)
 * Loads unified course_data.json and displays videos by subject and unit
 * Refactored to use modular components (PdfViewer, PlayerUI)
 */

// PDF.js worker path
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI Controller
  const ui = new window.KouTech.PlayerUI();
  
  // Make UI methods available globally if needed by inline HTML handlers (though we prefer removing inline handlers)
  // For compatibility with any remaining onclick handlers
  window.openBottomSheet = (type) => ui.openBottomSheet(type);
  window.closeBottomSheet = () => ui.closeBottomSheet();

  const urlParams = new URLSearchParams(window.location.search);
  const subjectParam = urlParams.get('subject');
  const unitParam = urlParams.get('unit');
  let currentVideoNumber = parseInt(urlParams.get('video')) || 1;
  
  const elements = {
    videoContainer: document.querySelector('.video-container'),
    lessonList: document.getElementById('lesson-list'),
    sidebarTitle: document.getElementById('sidebar-title'),
    headerTitle: document.getElementById('header-title'),
    resourcesList: document.getElementById('resources-list')
  };

  let allCourseData = null;
  let currentUnitData = null;
  let player = null;
  let youtubeAPIReady = false;
  let pendingVideoLoad = null; // YouTube APIが読み込まれる前に動画を読み込もうとした場合の待機キュー
  // let pdfViewer = null; // Store reference if needed

  // Attach event listeners for mobile action buttons manually here if not done in UI class
  // Ideally PlayerUI handles generic toggles, but specific buttons like "Lesson List" might need binding here
  // if they rely on specific IDs. The PlayerUI class handles .mobile-action-btn generally but we need to know WHICH one.
  // We will rely on the HTML update to add data-target attributes to buttons, which PlayerUI can use.
  
  // Mapping subject name to folder
  function getSubjectFolder(subjectName) {
    const mapping = {
      '数Ⅰ': 'math_1',
      '数Ⅱ': 'math_2',
      '数Ⅲ': 'math_3',
      '数A': 'math_A',
      '数B': 'math_B',
      '数C': 'math_c'
    };
    return mapping[subjectName] || 'math_1';
  }

  // Initialize Data
  fetch('course_data.json')
    .then(response => {
      // HTTPエラーステータスをチェック
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // データの構造をチェック
      if (!data || !data.subjects || !Array.isArray(data.subjects)) {
        throw new Error('Invalid course data format');
      }
      
      allCourseData = data;
      const subject = data.subjects.find(s => s.subject_name === subjectParam);
      if (subject) {
        const unit = subject.units.find(u => u.unit_name === unitParam);
        if (unit) {
          currentUnitData = {
            subject_name: subject.subject_name,
            unit_name: unit.unit_name,
            videos: unit.videos,
            materials: unit.materials || null
          };
          
          updateSidebarTitle();
          renderSidebar();
          loadVideo(currentVideoNumber);
        } else {
          console.error('Unit not found:', unitParam);
          showError('指定された単元が見つかりません');
        }
      } else {
        console.error('Subject not found:', subjectParam);
        showError('指定された科目が見つかりません');
      }
    })
    .catch(error => {
      console.error('Error loading course data:', error);
      // エラーの詳細をログに出力（デバッグ用）
      if (error.message) {
        console.error('Error message:', error.message);
      }
      // エラーメッセージを表示しない（ユーザー体験を優先）
      // 代わりに、読み込み中の表示を維持するか、静かに失敗する
      if (elements.videoContainer) {
        elements.videoContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;">読み込み中...</div>';
      }
    });

  function showError(msg) {
    if (elements.videoContainer) {
      elements.videoContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#fff;">${msg}</div>`;
    } else {
      console.error('Error message (videoContainer not found):', msg);
    }
  }

  // YouTube API Setup
  window.onYouTubeIframeAPIReady = function() {
    youtubeAPIReady = true;
    // 待機中の動画読み込みがあれば実行
    if (pendingVideoLoad) {
      const { video } = pendingVideoLoad;
      pendingVideoLoad = null;
      setupYouTubePlayer(video);
    }
  };

  // Load YouTube API Script
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  function loadVideo(videoNumber) {
    const video = findVideoByNumber(videoNumber);
    if (!video) return;

    currentVideoNumber = videoNumber;
    
    // Update URL
    const newUrl = `${window.location.pathname}?subject=${encodeURIComponent(currentUnitData.subject_name)}&unit=${encodeURIComponent(currentUnitData.unit_name)}&video=${videoNumber}`;
    window.history.pushState({path: newUrl}, '', newUrl);

    // Update Active State
    document.querySelectorAll('.lesson-item').forEach(item => {
      item.classList.remove('active');
      if (parseInt(item.dataset.number) === videoNumber) {
        item.classList.add('active');
        // Scroll active item into view (Mobile)
        if (window.innerWidth <= 768) {
          setTimeout(() => {
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 100);
        }
      }
    });

    // Render Resources (PDF)
    renderResources(video);

    // Render Description
    renderVideoDescription(video);

    // Close bottom sheet if open (Mobile)
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        ui.closeBottomSheet();
      }, 500);
    }

    // Setup YouTube Player
    // 動画コンテナの「読み込み中...」を削除（既に動画が読み込まれている場合は不要）
    if (elements.videoContainer) {
      const loadingMessage = elements.videoContainer.querySelector('div:not(#player)');
      if (loadingMessage && loadingMessage.textContent.includes('読み込み中')) {
        loadingMessage.remove();
      }
    }
    setupYouTubePlayer(video);
  }

  function setupYouTubePlayer(video) {
    if (!video.youtube_id) {
      elements.videoContainer.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; background:#000; color:#fff; font-size:1.2rem;">動画準備中...</div>';
      if (player) {
        player.destroy();
        player = null;
      }
    } else {
      // YouTube APIが読み込まれていない場合は待機
      if (!youtubeAPIReady || typeof YT === 'undefined' || !YT.Player) {
        pendingVideoLoad = { video };
        // APIが読み込まれるまで待つ（onYouTubeIframeAPIReadyで処理される）
        return;
      }
      
      if (!elements.videoContainer.querySelector('#player')) {
        elements.videoContainer.innerHTML = '<div id="player"></div>';
      }
      
      if (player) {
        player.loadVideoById(video.youtube_id);
      } else {
        player = new YT.Player('player', {
          height: '100%',
          width: '100%',
          videoId: video.youtube_id,
          playerVars: { 'playsinline': 1, 'rel': 0 },
          events: {
            onReady: function(event) {
              // 動画の読み込みが完了したことを確認
              // 「読み込み中...」は既に削除されているはず
            },
            onStateChange: function(event) {
              // 動画の状態が変化したときの処理（必要に応じて）
            }
          }
        });
      }
    }
  }

  function updateSidebarTitle() {
    if (elements.headerTitle && currentUnitData) {
      elements.headerTitle.textContent = `${currentUnitData.subject_name} ${currentUnitData.unit_name}`;
    }
  }

  function renderSidebar() {
    // 「読み込み中...」を削除
    if (elements.lessonList) {
      elements.lessonList.innerHTML = '';
    }

    currentUnitData.videos.forEach(video => {
      const isNotReady = !video.youtube_id;
      const item = document.createElement('div');
      item.className = `lesson-item ${isNotReady ? 'not-ready' : ''}`;
      item.dataset.number = video.video_number;
      
      if (!isNotReady) {
        item.addEventListener('click', () => loadVideo(video.video_number));
      }
      
      const thumbnailUrl = video.youtube_id 
        ? `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`
        : '';
      
      item.innerHTML = `
        <div class="lesson-number">${video.video_number}</div>
        <div class="lesson-thumbnail">
          ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="${video.title}" loading="lazy">` : '<div class="thumbnail-placeholder">準備中</div>'}
          ${!isNotReady ? '<div class="play-overlay">▶</div>' : ''}
        </div>
        <div class="lesson-info">
          <span class="lesson-title">${video.title}${isNotReady ? ' <span style="color:var(--text-sub); font-size:0.8rem;">(準備中)</span>' : ''}</span>
          <span class="lesson-duration">${video.duration || '00:00'}</span>
        </div>
      `;
      elements.lessonList.appendChild(item);
    });

    renderMathJax(elements.lessonList);
  }

  function renderVideoDescription(video) {
    const descriptionContent = document.querySelector('.description-content');
    if (!descriptionContent) return;

    // 「読み込み中...」を削除
    const description = video.description || '';
    
    if (description) {
      let formattedDescription;
      if (description.trim().startsWith('<')) {
        formattedDescription = description;
      } else {
        formattedDescription = description
          .split('\n')
          .filter(line => line.trim() !== '')
          .map(line => `<p style="color: var(--text-sub); margin-bottom: 1rem;">${line.trim()}</p>`)
          .join('');
      }
      
      descriptionContent.innerHTML = formattedDescription;
      renderMathJax(descriptionContent);
    } else {
      descriptionContent.innerHTML = '<p style="color: var(--text-sub); margin-bottom: 1rem;">動画の概要は準備中です。</p>';
    }
  }

  function renderResources(video) {
    elements.resourcesList.innerHTML = '';
    
    // Remove existing controls if any (though we clear innerHTML so maybe redundant but good for safety if controls were outside)
    const existingControls = document.querySelector('.pdf-controls-wrapper');
    if (existingControls) existingControls.remove();
    
    if (video.material_file_id) {
      const fileName = video.material_file_id.endsWith('.pdf') 
        ? video.material_file_id 
        : `${video.material_file_id}.pdf`;
      
      const subjectFolder = getSubjectFolder(currentUnitData.subject_name);
      const encodedUnitFolder = encodeURIComponent(currentUnitData.unit_name);
      const encodedFileName = encodeURIComponent(fileName);
      const pdfPath = `materials/pdf/${subjectFolder}/${encodedUnitFolder}/${encodedFileName}`;
      
      // Setup PDF Viewer
      // We need a container. In the old code, it appended controls to sidebar header and viewer to list.
      // Let's create a dedicated container for the viewer within resourcesList
      
      const viewerContainer = document.createElement('div');
      viewerContainer.className = 'pdf-viewer-container';
      elements.resourcesList.appendChild(viewerContainer);

      // Initialize PDF Viewer Component
      // Note: We might want to separate controls placement if we want them sticky
      // The PdfViewer class we built assumes it manages its internal structure.
      // If we want controls OUTSIDE the viewer (e.g. under header), we might need to adjust.
      // For now, let's let PdfViewer render everything inside viewerContainer.
      // If the design requires controls at a specific DOM location (like under sidebar-header), 
      // we should probably modify PdfViewer to accept a separate controls container or move elements after render.
      
      // To match previous design:
      // Controls were inserted after sidebar-header.
      // Viewer was in resourcesList.
      
      // Let's instantiate PdfViewer targeting resourcesList, but we might want to manually create controls 
      // or update PdfViewer to support external controls.
      // Since we didn't implement external controls logic in PdfViewer yet, let's keep it simple:
      // The PdfViewer will render controls inside itself.
      
      new window.KouTech.PdfViewer(viewerContainer, pdfPath);
      
    } else {
      const driveLink = document.createElement('div');
      driveLink.className = 'resource-link';
      driveLink.style.cursor = 'default';
      driveLink.style.opacity = '0.6';
      driveLink.innerHTML = `<span class="resource-icon">📁</span> 講義資料 (準備中)`;
      elements.resourcesList.appendChild(driveLink);
    }
  }

  function renderMathJax(element) {
    if (window.MathJax && window.MathJax.typesetPromise) {
      MathJax.typesetPromise([element]).then(() => {
        const mathElements = element.querySelectorAll('.MathJax mtext[mathvariant="bold"], .MathJax .MathJax-Bold');
        mathElements.forEach(el => {
          el.style.color = '#ffd700';
          el.style.fill = '#ffd700';
        });
      }).catch(err => console.error('MathJax rendering error:', err));
    } else if (window.MathJax && window.MathJax.typeset) {
      MathJax.typeset([element]);
    } else {
      setTimeout(() => {
        if (window.MathJax && window.MathJax.typesetPromise) {
           MathJax.typesetPromise([element]).catch(err => console.error('MathJax rendering error (retry):', err));
        }
      }, 1000);
    }
  }

  function findVideoByNumber(videoNumber) {
    return currentUnitData.videos.find(v => v.video_number === videoNumber) || null;
  }
});
