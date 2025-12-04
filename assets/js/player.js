/**
 * KouTech Video Player Logic (Unified Course Data)
 * Loads unified course_data.json and displays videos by subject and unit
 */

// PDF.jsのワーカーファイルのパスを設定
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

document.addEventListener('DOMContentLoaded', () => {
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

  // 科目名からフォルダ名を取得する関数
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

  // Initialize
  fetch('course_data.json')
    .then(response => response.json())
    .then(data => {
      allCourseData = data;
      // Find the subject and unit from URL params
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
          initPlayer();
          updateSidebarTitle();
          renderSidebar();
          loadVideo(currentVideoNumber);
        } else {
          console.error('Unit not found:', unitParam);
        }
      } else {
        console.error('Subject not found:', subjectParam);
      }
    })
    .catch(error => console.error('Error loading course data:', error));

  // YouTube API Setup
  window.onYouTubeIframeAPIReady = function() {
    // API is ready, but we wait for loadVideo to create the player
  };

  // Load YouTube API Script
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  function initPlayer() {
    // Initial player setup if needed
  }

  function loadVideo(videoNumber) {
    const video = findVideoByNumber(videoNumber);
    if (!video) return;

    currentVideoNumber = videoNumber;
    
    // Update URL without reload
    const newUrl = `${window.location.pathname}?subject=${encodeURIComponent(currentUnitData.subject_name)}&unit=${encodeURIComponent(currentUnitData.unit_name)}&video=${videoNumber}`;
    window.history.pushState({path: newUrl}, '', newUrl);

    // Update Active State in Sidebar
    document.querySelectorAll('.lesson-item').forEach(item => {
      item.classList.remove('active');
      if (parseInt(item.dataset.number) === videoNumber) {
        item.classList.add('active');
        // Scroll active item into view in mobile bottom sheet
        if (window.innerWidth <= 768) {
          setTimeout(() => {
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 100);
        }
      }
    });

    // Render Resources
    renderResources(video);

    // Close bottom sheet on mobile after video loads
    if (window.innerWidth <= 768 && typeof closeBottomSheet === 'function') {
      setTimeout(() => {
        closeBottomSheet();
      }, 500);
    }

    // Setup Video
    if (!video.youtube_id) {
      // Video is not ready yet
      elements.videoContainer.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; background:#000; color:#fff; font-size:1.2rem;">動画準備中...</div>';
      if (player) {
        player.destroy();
        player = null;
      }
    } else {
      // Restore video container structure
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
          playerVars: {
            'playsinline': 1,
            'rel': 0
          },
          events: {}
        });
      }
    }
  }

  function updateSidebarTitle() {
    // ヘッダーに科目名と単元名を表示
    if (elements.headerTitle && currentUnitData) {
      elements.headerTitle.textContent = `${currentUnitData.subject_name} ${currentUnitData.unit_name}`;
    }
    // sidebar-titleは「動画一覧」のまま（HTMLで既に設定済み）
  }

  function renderSidebar() {
    elements.lessonList.innerHTML = '';

    currentUnitData.videos.forEach(video => {
      const isNotReady = !video.youtube_id;
      const item = document.createElement('div');
      item.className = `lesson-item ${isNotReady ? 'not-ready' : ''}`;
      item.dataset.number = video.video_number;
      if (!isNotReady) {
        item.onclick = () => loadVideo(video.video_number);
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
  }


  function renderResources(video) {
    elements.resourcesList.innerHTML = '';
    
    // 既存のPDFコントロールバーを削除（あれば）
    const existingControls = document.querySelector('.pdf-controls-wrapper');
    if (existingControls) {
      existingControls.remove();
    }
    
    
    // ローカルPDF講義資料
    if (currentUnitData.materials && currentUnitData.materials.type === 'google_drive') {
      let pdfPath = null;
      
      // 各動画に対応するPDFファイルを個別に指定する方式
      if (video.material_file_id) {
        // material_file_idがファイル名（例：数と式_Part1.pdf）として扱われる
        const fileName = video.material_file_id.endsWith('.pdf') 
          ? video.material_file_id 
          : `${video.material_file_id}.pdf`;
        // 科目名とユニット名からパスを生成
        const subjectFolder = getSubjectFolder(currentUnitData.subject_name);
        const unitFolder = currentUnitData.unit_name;
        pdfPath = `materials/pdf/${subjectFolder}/${unitFolder}/${fileName}`;
      }
      
      if (pdfPath) {
        // PDFコントロールバーをsidebar-headerの下に配置
        const sidebarRight = document.getElementById('sidebar-right');
        const sidebarHeader = sidebarRight.querySelector('.sidebar-header');
        const resourcesList = document.getElementById('resources-list');
        
        // PDFコントロールバーのラッパー
        const pdfControlsWrapper = document.createElement('div');
        pdfControlsWrapper.className = 'pdf-controls-wrapper desktop-only';
        
        // 開閉ボタン
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'pdf-controls-toggle';
        toggleBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>';
        toggleBtn.setAttribute('aria-label', 'PDFコントロールを開閉');
        
        // PDFコントロールバー
        const pdfControls = document.createElement('div');
        pdfControls.className = 'pdf-controls';
        pdfControls.style.display = 'none'; // 初期状態は閉じている
        
        // 拡大ボタン
        const zoomInBtn = document.createElement('button');
        zoomInBtn.className = 'pdf-control-btn';
        zoomInBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
        zoomInBtn.setAttribute('aria-label', '拡大');
        zoomInBtn.title = '拡大 (+キー)';
        
        // 縮小ボタン
        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.className = 'pdf-control-btn';
        zoomOutBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
        zoomOutBtn.setAttribute('aria-label', '縮小');
        zoomOutBtn.title = '縮小 (-キー)';
        
        // スケール表示
        const zoomLevel = document.createElement('span');
        zoomLevel.className = 'pdf-zoom-level';
        
        // リセットボタン
        const resetBtn = document.createElement('button');
        resetBtn.className = 'pdf-control-btn';
        resetBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 21v-5h5"></path></svg>';
        resetBtn.setAttribute('aria-label', 'リセット');
        resetBtn.title = '位置とズームをリセット (Rキー)';
        
        // 操作ガイドボタン
        const helpBtn = document.createElement('button');
        helpBtn.className = 'pdf-control-btn';
        helpBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        helpBtn.setAttribute('aria-label', '操作方法');
        helpBtn.title = '操作方法を表示';
        
        // 新しいタブで開くボタン
        const openLink = document.createElement('a');
        openLink.href = pdfPath;
        openLink.target = '_blank';
        openLink.className = 'pdf-control-btn';
        openLink.setAttribute('aria-label', '新しいタブで開く');
        openLink.title = '新しいタブで開く';
        openLink.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>';
        
        pdfControls.appendChild(zoomOutBtn);
        pdfControls.appendChild(zoomLevel);
        pdfControls.appendChild(zoomInBtn);
        pdfControls.appendChild(resetBtn);
        pdfControls.appendChild(helpBtn);
        pdfControls.appendChild(openLink);
        
        // 開閉機能
        let isControlsOpen = false;
        toggleBtn.addEventListener('click', function() {
          isControlsOpen = !isControlsOpen;
          if (isControlsOpen) {
            pdfControls.style.display = 'flex';
            toggleBtn.querySelector('svg').style.transform = 'rotate(180deg)';
          } else {
            pdfControls.style.display = 'none';
            toggleBtn.querySelector('svg').style.transform = 'rotate(0deg)';
          }
        });
        
        pdfControlsWrapper.appendChild(toggleBtn);
        pdfControlsWrapper.appendChild(pdfControls);
        
        // sidebar-headerの下に挿入
        sidebarHeader.insertAdjacentElement('afterend', pdfControlsWrapper);
        
        // 講義資料の表示エリア
        const materialsContainer = document.createElement('div');
        materialsContainer.className = 'materials-container';
        materialsContainer.style.marginTop = '1rem';
        materialsContainer.style.display = 'flex';
        materialsContainer.style.gap = '0.75rem';
        materialsContainer.style.alignItems = 'flex-start';
        
        // PDFビューアのラッパー
        const pdfWrapper = document.createElement('div');
        pdfWrapper.style.flex = '1';
        pdfWrapper.style.position = 'relative';
        
        // PDF.jsを使用してPDFを表示（ダウンロード・印刷・メニューを非表示）
        const pdfViewer = document.createElement('div');
        pdfViewer.className = 'pdf-viewer';
        pdfViewer.style.width = '100%';
        pdfViewer.style.height = '600px';
        pdfViewer.style.border = 'none';
        pdfViewer.style.borderRadius = '0 0 var(--radius-md) var(--radius-md)';
        pdfViewer.style.backgroundColor = '#181818';
        pdfViewer.style.overflow = 'auto';
        pdfViewer.style.position = 'relative';
        
        // Canvasをラッパーで囲む（ドラッグ移動用）
        const canvasWrapper = document.createElement('div');
        canvasWrapper.style.position = 'relative';
        canvasWrapper.style.width = '100%';
        canvasWrapper.style.height = '100%';
        canvasWrapper.style.overflow = 'hidden';
        canvasWrapper.style.cursor = 'grab';
        
        const canvas = document.createElement('canvas');
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';
        canvas.style.position = 'relative';
        canvas.style.transition = 'transform 0.1s ease-out';
        // 縦横比を維持するための設定
        canvas.style.maxWidth = 'none';
        canvas.style.maxHeight = 'none';
        canvas.style.boxSizing = 'content-box';
        canvasWrapper.appendChild(canvas);
        pdfViewer.appendChild(canvasWrapper);
        
        // PDFをレンダリングする関数
        let currentPdf = null;
        let currentPage = null;
        let currentScale = null; // 現在のスケールを保持
        let currentTranslateX = 0; // 現在のX位置
        let currentTranslateY = 0; // 現在のY位置
        
        function renderPdf(customScale = null) {
          if (!currentPdf || !currentPage) return;
          
          // デバイスのピクセル比を取得（Retinaディスプレイなどで2や3になる）
          const dpr = window.devicePixelRatio || 1;
          
          // スケールの決定
          let scale;
          if (customScale !== null) {
            // カスタムスケールが指定されている場合（拡大縮小時）
            scale = customScale;
            currentScale = scale;
          } else if (currentScale !== null) {
            // 既存のスケールがある場合はそれを使用
            scale = currentScale;
          } else {
            // 初期スケールを計算
            const pdfWrapperWidth = pdfWrapper.offsetWidth || 400;
            const isMobile = window.innerWidth <= 768;
            
            let padding, scaleFactor;
            if (isMobile) {
              // モバイル版: 左右に同じ余白を持たせて中央に配置
              padding = 16; // 左右の余白（合計32px）
              scaleFactor = 0.98; // 少し小さめにして余白を確保
            } else {
              // デスクトップ版: 従来通りの計算
              padding = 16;
              scaleFactor = 0.95;
            }
            
            const availableWidth = pdfWrapperWidth - padding;
            const defaultViewport = currentPage.getViewport({ scale: 1.0 });
            const pageWidth = defaultViewport.width;
            scale = (availableWidth * scaleFactor) / pageWidth;
            scale = Math.min(scale, 3.0);
            scale = Math.max(scale, 0.8);
            currentScale = scale;
          }
          
          const viewport = currentPage.getViewport({ scale: scale });
          
          // Canvasのサイズ設定（縦横比を確実に維持）
          const outputScale = dpr;
          
          // 内部解像度（物理ピクセル）を先に設定
          const canvasWidth = Math.floor(viewport.width * outputScale);
          const canvasHeight = Math.floor(viewport.height * outputScale);
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          
          // CSSサイズ（表示サイズ）を設定 - viewportのサイズをそのまま使用して縦横比を維持
          // 重要: viewport.widthとviewport.heightはPDFページの縦横比を維持している
          // 縦横比を確実に維持するため、一度すべてのサイズ関連スタイルをリセット
          canvas.style.removeProperty('width');
          canvas.style.removeProperty('height');
          canvas.style.removeProperty('max-width');
          canvas.style.removeProperty('max-height');
          canvas.style.removeProperty('min-width');
          canvas.style.removeProperty('min-height');
          
          // 新しいサイズを設定（viewportから取得した値をそのまま使用）
          canvas.style.width = viewport.width + 'px';
          canvas.style.height = viewport.height + 'px';
          canvas.style.maxWidth = 'none';
          canvas.style.maxHeight = 'none';
          canvas.style.boxSizing = 'content-box';
          canvas.style.flexShrink = '0';
          
          // コンテキストをクリアしてからスケールを設定
          const context = canvas.getContext('2d');
          context.clearRect(0, 0, canvasWidth, canvasHeight);
          context.scale(outputScale, outputScale);
          
          const renderContext = {
            canvasContext: context,
            viewport: viewport
          };
          currentPage.render(renderContext);
          
          // 位置を適用
          updateCanvasPosition();
          updateZoomLevel(); // スケール表示を更新
        }
        
        // Canvasの位置を更新する関数
        function updateCanvasPosition() {
          canvas.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px)`;
        }
        
        // スケール表示を更新する関数
        function updateZoomLevel() {
          if (currentScale !== null) {
            zoomLevel.textContent = Math.round(currentScale * 100) + '%';
          }
        }
        
        // 拡大関数
        function zoomIn() {
          if (!currentPdf || !currentPage) return;
          const newScale = Math.min(5.0, (currentScale || 1.0) + 0.2);
          renderPdf(newScale);
        }
        
        // 縮小関数
        function zoomOut() {
          if (!currentPdf || !currentPage) return;
          const newScale = Math.max(0.5, (currentScale || 1.0) - 0.2);
          renderPdf(newScale);
        }
        
        // リセット関数
        function resetZoom() {
          if (!currentPdf || !currentPage) return;
          currentTranslateX = 0;
          currentTranslateY = 0;
          currentScale = null; // 初期スケールに戻す
          renderPdf();
        }
        
        // ボタンにイベントを追加
        zoomInBtn.addEventListener('click', zoomIn);
        zoomOutBtn.addEventListener('click', zoomOut);
        resetBtn.addEventListener('click', resetZoom);
        
        // 操作ガイドの表示
        let helpTooltip = null;
        helpBtn.addEventListener('click', function() {
          if (helpTooltip) {
            helpTooltip.remove();
            helpTooltip = null;
            return;
          }
          
          helpTooltip = document.createElement('div');
          helpTooltip.className = 'pdf-help-tooltip';
          helpTooltip.innerHTML = `
            <div class="pdf-help-content">
              <h4>PDF操作方法</h4>
              <ul>
                <li><strong>ドラッグ</strong>: クリックしながら動かしてPDFを移動</li>
                <li><strong>拡大/縮小</strong>: Ctrl/Cmd + ホイール、または +/- キー</li>
                <li><strong>リセット</strong>: Rキー、またはリセットボタン</li>
                <li><strong>スクロール</strong>: 通常のホイール操作</li>
              </ul>
              <button class="pdf-help-close">閉じる</button>
            </div>
          `;
          pdfViewer.appendChild(helpTooltip);
          
          // 閉じるボタンのイベント
          const closeBtn = helpTooltip.querySelector('.pdf-help-close');
          closeBtn.addEventListener('click', function() {
            helpTooltip.remove();
            helpTooltip = null;
          });
          
          // 10秒後に自動で閉じる
          setTimeout(() => {
            if (helpTooltip) {
              helpTooltip.remove();
              helpTooltip = null;
            }
          }, 10000);
        });
        
        // キーボードショートカット
        const pdfKeyHandler = function(e) {
          // PDFが表示されている場合のみ
          if (!pdfViewer.querySelector('canvas')) return;
          
          if (e.key === '+' || e.key === '=') {
            if (!e.shiftKey) {
              e.preventDefault();
              zoomIn();
            }
          } else if (e.key === '-' || e.key === '_') {
            if (!e.shiftKey) {
              e.preventDefault();
              zoomOut();
            }
          } else if (e.key === 'r' || e.key === 'R') {
            if (!e.ctrlKey && !e.metaKey) {
              e.preventDefault();
              resetZoom();
            }
          }
        };
        document.addEventListener('keydown', pdfKeyHandler);
        
        // ドラッグ機能
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragStartTranslateX = 0;
        let dragStartTranslateY = 0;
        
        canvasWrapper.addEventListener('mousedown', function(e) {
          // 左クリックのみ
          if (e.button !== 0) return;
          
          isDragging = true;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
          dragStartTranslateX = currentTranslateX;
          dragStartTranslateY = currentTranslateY;
          canvasWrapper.style.cursor = 'grabbing';
          canvas.style.transition = 'none'; // ドラッグ中はトランジションを無効化
          e.preventDefault();
        });
        
        document.addEventListener('mousemove', function(e) {
          if (!isDragging) return;
          
          const deltaX = e.clientX - dragStartX;
          const deltaY = e.clientY - dragStartY;
          
          currentTranslateX = dragStartTranslateX + deltaX;
          currentTranslateY = dragStartTranslateY + deltaY;
          
          updateCanvasPosition();
        });
        
        document.addEventListener('mouseup', function(e) {
          if (!isDragging) return;
          
          isDragging = false;
          canvasWrapper.style.cursor = 'grab';
          canvas.style.transition = 'transform 0.1s ease-out'; // トランジションを復元
        });
        
        // マウスホイールで拡大縮小（カーソル位置を中心に）
        pdfViewer.addEventListener('wheel', function(e) {
          // Ctrlキー（MacではCmdキー）が押されている場合のみ拡大縮小
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault(); // デフォルトのスクロールを防止
            
            if (!currentPdf || !currentPage) return;
            
            // カーソル位置（ビューア内の相対座標）を取得
            const pdfViewerRect = pdfViewer.getBoundingClientRect();
            const mouseX = e.clientX - pdfViewerRect.left + pdfViewer.scrollLeft;
            const mouseY = e.clientY - pdfViewerRect.top + pdfViewer.scrollTop;
            
            // ホイールの方向に応じてスケールを変更
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const oldScale = currentScale || 1.0;
            const newScale = Math.max(0.5, Math.min(5.0, oldScale + delta));
            
            // カーソル位置がPDF座標系のどこに対応するかを計算
            const canvasRect = canvas.getBoundingClientRect();
            const canvasCenterX = canvasRect.left - pdfViewerRect.left + canvasRect.width / 2 + pdfViewer.scrollLeft;
            const canvasCenterY = canvasRect.top - pdfViewerRect.top + canvasRect.height / 2 + pdfViewer.scrollTop;
            
            // カーソル位置からCanvas中心への相対位置（PDF座標系）
            const pdfX = (mouseX - canvasCenterX - currentTranslateX) / oldScale;
            const pdfY = (mouseY - canvasCenterY - currentTranslateY) / oldScale;
            
            // 新しいスケールでPDFをレンダリング
            currentScale = newScale;
            renderPdf(newScale);
            
            // スケール変更後のCanvas位置を取得
            const canvasRectAfter = canvas.getBoundingClientRect();
            const canvasCenterXAfter = canvasRectAfter.left - pdfViewerRect.left + canvasRectAfter.width / 2 + pdfViewer.scrollLeft;
            const canvasCenterYAfter = canvasRectAfter.top - pdfViewerRect.top + canvasRectAfter.height / 2 + pdfViewer.scrollTop;
            
            // カーソル位置が同じ位置に残るように位置を調整
            const newPdfXScreen = pdfX * newScale;
            const newPdfYScreen = pdfY * newScale;
            
            currentTranslateX = mouseX - canvasCenterXAfter - newPdfXScreen;
            currentTranslateY = mouseY - canvasCenterYAfter - newPdfYScreen;
            
            updateCanvasPosition();
            updateZoomLevel();
          }
        }, { passive: false });
        
        // PDF.jsでPDFを読み込んで表示
        pdfjsLib.getDocument(pdfPath).promise.then(function(pdf) {
          currentPdf = pdf;
          // 最初のページを表示
          pdf.getPage(1).then(function(page) {
            currentPage = page;
            renderPdf();
            
            // 初回表示時のツールチップ（localStorageで管理）
            const hasSeenTooltip = localStorage.getItem('pdf-help-seen');
            if (!hasSeenTooltip) {
              setTimeout(() => {
                const firstTimeTooltip = document.createElement('div');
                firstTimeTooltip.className = 'pdf-first-time-tooltip';
                firstTimeTooltip.textContent = '💡 ドラッグで移動、Ctrl+ホイールで拡大縮小';
                pdfViewer.appendChild(firstTimeTooltip);
                
                setTimeout(() => {
                  firstTimeTooltip.style.opacity = '0';
                  firstTimeTooltip.style.transition = 'opacity 0.3s ease';
                  setTimeout(() => {
                    firstTimeTooltip.remove();
                    localStorage.setItem('pdf-help-seen', 'true');
                  }, 300);
                }, 5000);
              }, 1000);
            }
          });
        }).catch(function(error) {
          console.error('PDF読み込みエラー:', error);
          console.error('PDFパス:', pdfPath);
          pdfViewer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-sub);">PDFの読み込みに失敗しました<br><small>' + pdfPath + '</small></div>';
        });
        
        // ウィンドウリサイズ時にPDFを再レンダリング（現在のスケールを保持）
        let resizeTimeout;
        window.addEventListener('resize', function() {
          clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(function() {
            // 現在のスケールを保持して再レンダリング
            if (currentScale !== null) {
              renderPdf(currentScale);
            } else {
              renderPdf();
            }
          }, 250);
        });
        
        pdfWrapper.appendChild(pdfViewer);
        materialsContainer.appendChild(pdfWrapper);
      
      elements.resourcesList.appendChild(materialsContainer);
      } else {
        // ファイルIDが取得できない場合
        const driveLink = document.createElement('div');
        driveLink.className = 'resource-link';
        driveLink.style.cursor = 'default';
        driveLink.style.opacity = '0.6';
        driveLink.innerHTML = `<span class="resource-icon">📁</span> 講義資料 (準備中)`;
        elements.resourcesList.appendChild(driveLink);
      }
    } else {
      // 講義資料がない場合
      const driveLink = document.createElement('div');
      driveLink.className = 'resource-link';
      driveLink.style.cursor = 'default';
      driveLink.style.opacity = '0.6';
      driveLink.innerHTML = `<span class="resource-icon">📁</span> 講義資料 (準備中)`;
      elements.resourcesList.appendChild(driveLink);
    }
  }

  function findVideoByNumber(videoNumber) {
    return currentUnitData.videos.find(v => v.video_number === videoNumber) || null;
  }
});
