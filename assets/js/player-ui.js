/**
 * KouTech 動画プレーヤー UI コントローラー
 * 
 * このクラスは，授業動画プレーヤーページのユーザーインターフェースを管理します。
 * 
 * 【主要な機能】
 * 1. デスクトップ版: サイドバーの開閉機能（折りたたみ/展開）
 * 2. モバイル版: ボトムシート（動画一覧・講義資料）の表示・非表示
 * 3. モバイル版: スワイプジェスチャーによるボトムシートの閉じ操作
 * 4. モバイル版: 画面外タップによるボトムシートの閉じ操作
 * 5. 科目別テーマカラーの自動適用
 * 6. ウィンドウリサイズ時のレスポンシブ対応
 * 7. スクロールロック（ボトムシート表示中の背景スクロール防止）
 * 
 * 【動作仕様】
 * 
 * ■ デスクトップ版（画面幅 > 768px）
 * - サイドバーは常に表示されており，折りたたみボタンで開閉可能
 * - 折りたたみ時はアイコンが「+」に，展開時は「−」に変化
 * - 左サイドバー（動画一覧）と右サイドバー（講義資料）は独立して操作可能
 * 
 * ■ モバイル版（画面幅 ≤ 768px）
 * - サイドバーは通常非表示で，ボトムシートとして動作
 * - 「動画一覧」「講義資料」ボタンでボトムシートを開く
 * - ボトムシートは動画コンテナの真下からスライドアップして表示
 * - 下方向へのスワイプ（100px以上，または高速スワイプ）で閉じる
 * - 画面外（動画エリアなど）をタップすると閉じる
 * - ボトムシート表示中は背景のスクロールをロック
 * 
 * ■ ジェスチャー処理
 * - ボトムシート内のスクロール可能なコンテンツがある場合，
 *   コンテンツのスクロールを優先し，最上部で下方向にドラッグした時のみ閉じる
 * - 速度と距離の両方を考慮して，自然な閉じ動作を実現
 * 
 * ■ レスポンシブ対応
 * - モバイルとデスクトップの切り替え時（768px境界）にボトムシート状態をリセット
 * - モバイル内でのリサイズ時は，開いているボトムシートの位置を再計算
 * 
 * 【依存関係】
 * - HTML構造: player.html に定義されたサイドバー要素とボタン要素
 * - CSS: style.css に定義されたボトムシート・サイドバー関連のスタイル
 */
class PlayerUI {
  /**
   * コンストラクタ
   * 定数・状態・DOM要素の参照を初期化し，初期セットアップを実行します。
   */
  constructor() {
    /**
     * 定数定義
     * - MOBILE_BREAKPOINT: モバイル/デスクトップの切り替えポイント（px）
     * - SWIPE_CLOSE_THRESHOLD: スワイプで閉じるための最小ドラッグ距離（px）
     * - BOTTOM_SHEET_CLOSE_DURATION: ボトムシート閉じるアニメーション時間（ms）
     * - VELOCITY_THRESHOLD: 速度による閉じ判定の閾値（px/ms）
     */
    this.CONSTANTS = {
      MOBILE_BREAKPOINT: 768,
      SWIPE_CLOSE_THRESHOLD: 100,
      BOTTOM_SHEET_CLOSE_DURATION: 300,
      VELOCITY_THRESHOLD: 0.5
    };

    /**
     * アプリケーションの状態管理
     * - justOpenedBottomSheet: ボトムシートを開いた直後の短い時間は外側タップを無視するフラグ
     * - lastWindowWidth: リサイズ検知のために保持する前回のウィンドウ幅
     * - drag: ドラッグ/スワイプ操作に関する状態
     *   - startY: ドラッグ開始時のY座標
     *   - currentY: 現在のY座標
     *   - isDragging: ドラッグ中かどうか
     *   - sidebar: 現在ドラッグ中のサイドバー要素
     *   - startTime: ドラッグ開始時刻
     *   - lastY: 前回のY座標（速度計算用）
     *   - lastTime: 前回の時刻（速度計算用）
     *   - velocity: 現在のドラッグ速度（px/ms）
     *   - initialScrollTop: ドラッグ開始時のスクロール位置
     */
    this.state = {
      justOpenedBottomSheet: false,
      lastWindowWidth: window.innerWidth,
      drag: {
        startY: 0,
        currentY: 0,
        isDragging: false,
        sidebar: null,
        startTime: 0,
        lastY: 0,
        lastTime: 0,
        velocity: 0,
        initialScrollTop: 0
      }
    };

    /**
     * DOM要素への参照をキャッシュ
     * パフォーマンス向上のため，頻繁にアクセスする要素はコンストラクタで一度だけ取得
     */
    this.elements = {
      overlay: document.getElementById('bottom-sheet-overlay'),
      sidebars: document.querySelectorAll('.player-sidebar-left, .player-sidebar-right'),
      layout: document.querySelector('.player-layout'),
      sidebarLeft: document.getElementById('sidebar-left'),
      sidebarRight: document.getElementById('sidebar-right'),
      header: document.querySelector('header'),
      videoContainer: document.querySelector('.video-container'),
      root: document.documentElement
    };

    // 初期セットアップを実行
    this.init();
  }

  /**
   * 初期化処理
   * イベントリスナーの登録，テーマ設定，状態監視のセットアップを実行します。
   */
  init() {
    this.setupEventListeners();
    this.setupTheme();
    this.setupObservers();
  }

  // ============================================================================
  // テーマ管理
  // ============================================================================

  /**
   * テーマの初期設定
   * URLパラメータから科目名を取得し，該当するテーマカラーを適用します。
   */
  setupTheme() {
    const urlParams = new URLSearchParams(window.location.search);
    const subjectParam = urlParams.get('subject');
    if (subjectParam) {
      this.setSubjectThemeColors(subjectParam);
    }
  }

  /**
   * 科目別テーマカラーの設定
   * 
   * 科目名に応じて，CSS変数（--accent-primary など）を設定します。
   * これにより，ボタンやアクセント要素の色が科目ごとに変更されます。
   * 
   * @param {string} subjectName - 科目名（例: '数Ⅰ', '数Ⅱ', '数A'など）
   */
  setSubjectThemeColors(subjectName) {
    let baseColor, darkColor, lightColor, gradientColor;
    
    // 科目名に応じたCSS変数を設定
    switch(subjectName) {
      case '数Ⅰ':
        baseColor = 'var(--subject-math1-base)';
        darkColor = 'var(--subject-math1-dark)';
        lightColor = 'var(--subject-math1-light)';
        gradientColor = 'var(--subject-math1-gradient)';
        break;
      case '数Ⅱ':
        baseColor = 'var(--subject-math2-base)';
        darkColor = 'var(--subject-math2-dark)';
        lightColor = 'var(--subject-math2-light)';
        gradientColor = 'var(--subject-math2-gradient)';
        break;
      case '数Ⅲ':
        baseColor = 'var(--subject-math3-base)';
        darkColor = 'var(--subject-math3-dark)';
        lightColor = 'var(--subject-math3-light)';
        gradientColor = 'var(--subject-math3-gradient)';
        break;
      case '数A':
        baseColor = 'var(--subject-mathA-base)';
        darkColor = 'var(--subject-mathA-dark)';
        lightColor = 'var(--subject-mathA-light)';
        gradientColor = 'var(--subject-mathA-gradient)';
        break;
      case '数B':
        baseColor = 'var(--subject-mathB-base)';
        darkColor = 'var(--subject-mathB-dark)';
        lightColor = 'var(--subject-mathB-light)';
        gradientColor = 'var(--subject-mathB-gradient)';
        break;
      case '数C':
        baseColor = 'var(--subject-mathC-base)';
        darkColor = 'var(--subject-mathC-dark)';
        lightColor = 'var(--subject-mathC-light)';
        gradientColor = 'var(--subject-mathC-gradient)';
        break;
      default:
        // デフォルトは数Ⅰのテーマを使用
        baseColor = 'var(--subject-math1-base)';
        darkColor = 'var(--subject-math1-dark)';
        lightColor = 'var(--subject-math1-light)';
        gradientColor = 'var(--subject-math1-gradient)';
    }
    
    // CSS変数をルート要素に設定（グローバルに適用される）
    this.elements.root.style.setProperty('--accent-primary', baseColor);
    this.elements.root.style.setProperty('--accent-primary-dark', darkColor);
    this.elements.root.style.setProperty('--accent-primary-light', lightColor);
    this.elements.root.style.setProperty('--accent-primary-gradient', gradientColor);
  }

  // ============================================================================
  // イベントリスナーの設定
  // ============================================================================

  /**
   * すべてのイベントリスナーを登録
   * 
   * 以下のイベントを監視します:
   * - ウィンドウリサイズ: レスポンシブ対応
   * - キーボード入力: ESCキーでボトムシートを閉じる
   * - タッチイベント: スワイプジェスチャーの検知
   * - クリック/タップ: 画面外タップの検知
   * - 各種ボタンクリック: サイドバー・ボトムシートの操作
   */
  setupEventListeners() {
    // ウィンドウリサイズ: モバイル/デスクトップ切り替え時に状態をリセット
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // キーボードショートカット: ESCキーでボトムシートを閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeBottomSheet();
    });

    // タッチイベント: モバイル版のスワイプジェスチャー検知
    // passive: false にすることで，preventDefault() を呼び出せるようにする
    document.addEventListener('touchstart', this.handleDragStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleDragMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleDragEnd.bind(this), { passive: false });
    
    // 画面外タップ検知: ボトムシート以外の領域をタップした時の処理
    // passive: true でパフォーマンスを最適化（preventDefault は使用しない）
    document.addEventListener('touchstart', this.handleOutsideTap.bind(this), { passive: true });
    document.addEventListener('click', this.handleOutsideTap.bind(this));

    // オーバーレイクリック: デスクトップ版でオーバーレイをクリックすると閉じる
    if (this.elements.overlay) {
      this.elements.overlay.addEventListener('click', () => this.closeBottomSheet());
    }

    // デスクトップ版: サイドバー折りたたみボタン
    document.querySelectorAll('.sidebar-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // クリックされたボタンが属するサイドバーを特定
        const sidebar = e.target.closest('aside');
        const side = sidebar.id === 'sidebar-left' ? 'left' : 'right';
        this.toggleSidebar(side);
      });
    });

    // モバイル版: アクションボタン（動画一覧・講義資料）
    // 注: HTMLの onclick 属性経由でも動作するため，ここではコメントアウト
    // 将来的に data-target 属性を使用した実装に変更することを推奨
    document.querySelectorAll('.mobile-action-btn').forEach(btn => {
      // 現在は HTML の onclick="openBottomSheet('...')" を使用
    });

    // モバイル版: ボトムシート内の閉じるボタン
    document.querySelectorAll('.bottom-sheet-close').forEach(btn => {
      btn.addEventListener('click', () => this.closeBottomSheet());
    });
  }

  /**
   * MutationObserver の設定
   * 
   * ボトムシートやオーバーレイの状態変化（class 属性の変更）を監視し，
   * 自動的にスクロールロックを制御します。
   */
  setupObservers() {
    // オーバーレイの状態変化を監視
    if (this.elements.overlay) {
      const observer = new MutationObserver(() => this.checkScrollLock());
      observer.observe(this.elements.overlay, { attributes: true, attributeFilter: ['class'] });
    }

    // 各サイドバーの状態変化を監視
    this.elements.sidebars.forEach(sidebar => {
      const observer = new MutationObserver(() => this.checkScrollLock());
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    });
  }

  // ============================================================================
  // デスクトップ版: サイドバー制御
  // ============================================================================

  /**
   * デスクトップ版: サイドバーの開閉を切り替え
   * 
   * サイドバーに 'collapsed' クラスを追加/削除し，
   * レイアウトクラス（left-collapsed, right-collapsed, both-collapsed）を更新します。
   * ボタンのアイコンも自動的に更新されます（開: 「−」, 閉: 「+」）。
   * 
   * @param {string} side - 'left' または 'right'（サイドバーの位置）
   */
  toggleSidebar(side) {
    // モバイル版では動作しない
    if (window.innerWidth <= this.CONSTANTS.MOBILE_BREAKPOINT) return;
    
    const sidebar = document.getElementById(`sidebar-${side}`);
    if (!sidebar) return;
    
    // 'collapsed' クラスの追加/削除
    sidebar.classList.toggle('collapsed');
    
    // レイアウトクラスの更新
    // 両方のサイドバーの状態に応じて適切なクラスを追加
    this.elements.layout.classList.remove('left-collapsed', 'right-collapsed', 'both-collapsed');
    
    const leftCollapsed = this.elements.sidebarLeft.classList.contains('collapsed');
    const rightCollapsed = this.elements.sidebarRight.classList.contains('collapsed');
    
    if (leftCollapsed && rightCollapsed) {
      this.elements.layout.classList.add('both-collapsed');
    } else if (leftCollapsed) {
      this.elements.layout.classList.add('left-collapsed');
    } else if (rightCollapsed) {
      this.elements.layout.classList.add('right-collapsed');
    }
    
    // ボタンのアイコンを更新（開: 「−」, 閉: 「+」）
    const toggleBtn = sidebar.querySelector('.sidebar-toggle span');
    if (toggleBtn) {
      toggleBtn.textContent = sidebar.classList.contains('collapsed') ? '+' : '−';
    }
  }

  // ============================================================================
  // モバイル版: ボトムシート制御
  // ============================================================================

  /**
   * モバイル版: ボトムシートを開く
   * 
   * 指定されたタイプのボトムシート（動画一覧または講義資料）を開きます。
   * モバイル版では，動画コンテナの真下からスライドアップするアニメーションで表示します。
   * デスクトップ版では，オーバーレイとともに表示します。
   * 
   * @param {string} type - 'lesson-list'（動画一覧）または 'resources'（講義資料）
   */
  openBottomSheet(type) {
    const sidebar = type === 'lesson-list' ? this.elements.sidebarLeft : this.elements.sidebarRight;
    if (!sidebar) return;

    // 閉じるアニメーション中のクラスを削除
    sidebar.classList.remove('bottom-sheet-closing');

    if (window.innerWidth <= this.CONSTANTS.MOBILE_BREAKPOINT) {
      // モバイル版: 位置を設定してからアニメーション
      this.positionBottomSheet(sidebar);
      
      // 強制的にリフローを発生させてスタイルを適用（アニメーション前の準備）
      void sidebar.offsetWidth;
      
      sidebar.classList.add('bottom-sheet-active');
      
      // スムーズなアニメーションのため，二重の requestAnimationFrame を使用
      // これにより，ブラウザのレンダリングサイクルを確実に待ってからアニメーションを開始
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // iOS Chrome風の滑らかなイージング関数を使用
          sidebar.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)';
          sidebar.style.transform = 'translateY(0)';
          
          // ボトムシートを開いた直後（400ms間）は，外側タップを無視する
          // これにより，意図しないタップで即座に閉じることを防ぐ
          this.state.justOpenedBottomSheet = true;
          setTimeout(() => {
            this.state.justOpenedBottomSheet = false;
          }, 400);
        });
      });
      
      // 背景のスクロールをロック
      document.body.style.overflow = 'hidden';
    } else {
      // デスクトップ版: オーバーレイとともに表示
      if (this.elements.overlay) this.elements.overlay.classList.add('active');
      sidebar.classList.add('bottom-sheet-active');
    }
  }

  /**
   * モバイル版: ボトムシートの位置を設定
   * 
   * ボトムシートを動画コンテナの真下に配置します。
   * 初期状態として，画面外（translateY(100%)）に配置してアニメーションの準備をします。
   * 
   * @param {HTMLElement} sidebar - 位置を設定するサイドバー要素
   */
  positionBottomSheet(sidebar) {
    if (!this.elements.header || !this.elements.videoContainer) return;
    
    // ヘッダーと動画コンテナの高さを取得
    const headerHeight = this.elements.header.offsetHeight;
    const videoHeight = this.elements.videoContainer.offsetHeight;
    // ボトムシートの開始位置 = ヘッダー高さ + 動画コンテナ高さ
    const topPosition = headerHeight + videoHeight;
    
    // 位置とサイズを設定
    sidebar.style.top = `${topPosition}px`;
    sidebar.style.bottom = '0';
    sidebar.style.height = `calc(100dvh - ${topPosition}px)`;
    
    // アニメーション用の初期状態: トランジションなしで画面外に配置
    sidebar.style.transition = 'none';
    sidebar.style.transform = 'translateY(100%)';
  }

  /**
   * ボトムシートを閉じる
   * 
   * 開いているすべてのボトムシートを下方向にスライドするアニメーションで閉じます。
   * アニメーション完了後，インラインスタイルとクラスをクリーンアップします。
   * デスクトップ版では，オーバーレイも同時に非表示にします。
   */
  closeBottomSheet() {
    this.elements.sidebars.forEach(sidebar => {
      if (sidebar.classList.contains('bottom-sheet-active')) {
        // 閉じるアニメーション: 下方向にスライドダウン
        sidebar.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)';
        sidebar.style.transform = 'translateY(100%)';
        
        // アニメーション完了後にクリーンアップ
        setTimeout(() => {
          sidebar.classList.remove('bottom-sheet-active');
          sidebar.classList.remove('bottom-sheet-closing');
          // インラインスタイルを削除してリセット
          sidebar.style.top = '';
          sidebar.style.bottom = '';
          sidebar.style.height = '';
          sidebar.style.transform = '';
          sidebar.style.transition = '';
        }, this.CONSTANTS.BOTTOM_SHEET_CLOSE_DURATION);
      }
    });

    // デスクトップ版: オーバーレイを非表示
    if (window.innerWidth > this.CONSTANTS.MOBILE_BREAKPOINT && this.elements.overlay) {
      this.elements.overlay.classList.remove('active');
    }
    
    // スクロールロックの解除
    // モバイル版では，ページレイアウトが固定されているため常に hidden を維持
    // デスクトップ版では，スクロールを復元
    if (window.innerWidth <= this.CONSTANTS.MOBILE_BREAKPOINT) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  // ============================================================================
  // レスポンシブ対応: ウィンドウリサイズ処理
  // ============================================================================

  /**
   * ウィンドウリサイズ時の処理
   * 
   * モバイル/デスクトップの切り替え時（768px境界）にボトムシートの状態をリセットします。
   * モバイル内でのリサイズ時は，開いているボトムシートの位置を再計算します。
   */
  handleResize() {
    const currentWidth = window.innerWidth;
    const { MOBILE_BREAKPOINT } = this.CONSTANTS;
    
    // モバイル ↔ デスクトップの境界をまたいだ場合
    if ((this.state.lastWindowWidth <= MOBILE_BREAKPOINT && currentWidth > MOBILE_BREAKPOINT) ||
        (this.state.lastWindowWidth > MOBILE_BREAKPOINT && currentWidth <= MOBILE_BREAKPOINT)) {
      
      // ボトムシートの状態を完全にリセット
      this.resetBottomSheets();
      document.body.style.overflow = '';
      
    } else if (currentWidth <= MOBILE_BREAKPOINT) {
      // モバイル内でのリサイズ時: 開いているボトムシートの位置を再計算
      this.elements.sidebars.forEach(sidebar => {
        if (sidebar.classList.contains('bottom-sheet-active')) {
          // ヘッダーと動画コンテナの高さが変わった場合に備えて，位置を再計算
          const headerHeight = this.elements.header.offsetHeight;
          const videoHeight = this.elements.videoContainer.offsetHeight;
          const topPosition = headerHeight + videoHeight;
          
          sidebar.style.top = `${topPosition}px`;
          sidebar.style.height = `calc(100dvh - ${topPosition}px)`;
        }
      });
    }
    
    // 現在のウィンドウ幅を記録
    this.state.lastWindowWidth = currentWidth;
  }

  /**
   * ボトムシートの状態を完全にリセット
   * 
   * モバイル/デスクトップ切り替え時に呼び出されます。
   * すべてのクラスとインラインスタイルを削除して，初期状態に戻します。
   */
  resetBottomSheets() {
    this.elements.sidebars.forEach(sidebar => {
      sidebar.classList.remove('bottom-sheet-active', 'bottom-sheet-closing');
      sidebar.removeAttribute('style'); // すべてのインラインスタイルを削除
      void sidebar.offsetWidth; // 強制リフロー
    });
    if (this.elements.overlay) this.elements.overlay.classList.remove('active');
  }

  // ============================================================================
  // スクロールロック制御
  // ============================================================================

  /**
   * スクロールロックの状態をチェックして適用
   * 
   * ボトムシートやオーバーレイの状態に応じて，背景のスクロールをロック/解除します。
   * MutationObserver から自動的に呼び出されます。
   */
  checkScrollLock() {
    if (window.innerWidth <= this.CONSTANTS.MOBILE_BREAKPOINT) {
      // モバイル版: レイアウトが固定されているため常にロック
      document.body.style.overflow = 'hidden';
    } else {
      // デスクトップ版: ボトムシートまたはオーバーレイが表示されている時のみロック
      const isOpen = Array.from(this.elements.sidebars).some(s => s.classList.contains('bottom-sheet-active'));
      const isOverlayActive = this.elements.overlay && this.elements.overlay.classList.contains('active');
      document.body.style.overflow = (isOpen || isOverlayActive) ? 'hidden' : '';
    }
  }

  // ============================================================================
  // モバイル版: ドラッグ/スワイプジェスチャー処理
  // ============================================================================

  /**
   * ドラッグ開始時の処理
   * 
   * ボトムシート上でタッチが開始された時に呼び出されます。
   * スクロール可能なコンテンツ内では，コンテンツのスクロールを優先します。
   * 最上部で下方向にドラッグした場合のみ，ボトムシートを閉じる操作として扱います。
   * 
   * @param {Event} e - タッチ/マウスイベント
   */
  handleDragStart(e) {
    // デスクトップ版では無効
    if (window.innerWidth > this.CONSTANTS.MOBILE_BREAKPOINT) return;
    
    // ボトムシートが開いているか確認
    const sidebar = e.target.closest('.player-sidebar-left.bottom-sheet-active, .player-sidebar-right.bottom-sheet-active');
    if (!sidebar) return;

    // PDFビューアのcanvas要素やその親要素を除外（PDFの操作を優先）
    if (e.target.closest('canvas, .pdf-viewer, .pdf-viewer-container')) {
      return;
    }

    // サイドバーヘッダーのタイトル要素（<h2>動画一覧</h2>または<h3>講義資料</h3>）を触れているときだけ許可
    const sidebarHeader = e.target.closest('.sidebar-header');
    if (sidebarHeader) {
      const titleElement = sidebarHeader.querySelector('h2, h3');
      // タイトル要素を直接触れているか、その親要素（.sidebar-header）を触れている場合のみ許可
      if (!titleElement || (e.target !== titleElement && !titleElement.contains(e.target) && e.target !== sidebarHeader)) {
        // タイトル要素以外の要素を触れている場合は除外
        return;
      }
    } else {
      // サイドバーヘッダー以外の要素を触れている場合は除外
      return;
    }

    // スクロール可能なコンテンツ（動画一覧・講義資料リスト）内でのタッチをチェック
    const scrollable = e.target.closest('.lesson-list, .resources-list');
    if (scrollable) {
      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      const isScrollable = scrollHeight > clientHeight;
      this.state.drag.initialScrollTop = scrollTop;

      // コンテンツがスクロールされている場合は，ドラッグを無効化（スクロールを優先）
      if (scrollTop > 0 && isScrollable) return;
      // 最下部に到達している場合も，上方向へのドラッグはスクロールを優先
      if (scrollTop + clientHeight >= scrollHeight - 1 && isScrollable) {
        // 下方向へのドラッグのみ許可（ボトムシートを閉じる操作）
      }
    }

    // ボタンやリンクなどのインタラクティブ要素は除外
    if (e.target.closest('button, a, input, select, textarea')) return;

    // ドラッグ状態を初期化
    const touchY = e.touches ? e.touches[0].clientY : e.clientY;
    this.state.drag = {
      ...this.state.drag,
      isDragging: true,
      sidebar: sidebar,
      startY: touchY,
      currentY: touchY,
      lastY: touchY,
      startTime: Date.now(),
      lastTime: Date.now(),
      velocity: 0
    };

    // 現在の transform 値を考慮して開始位置を調整
    // これにより，既に少し開いている状態からドラッグを開始しても正確に動作する
    const currentTransform = sidebar.style.transform || 'translateY(0)';
    const match = currentTransform.match(/translateY\(([^)]+)\)/);
    if (match) {
      const currentY = parseFloat(match[1]) || 0;
      this.state.drag.startY -= currentY;
    }
    
    // 注意: e.preventDefault() は touchmove で呼び出すため，ここでは呼び出さない
    // これにより，スクロール可能なコンテンツの通常のスクロール動作を優先できる
  }

  /**
   * ドラッグ中の処理
   * 
   * ボトムシートを指の動きに追従させて移動します。
   * 速度計算も行い，高速スワイプ検知の準備をします。
   * 上方向へのドラッグは -50px までに制限されます（自然な操作感のため）。
   * 
   * @param {Event} e - タッチ/マウスイベント
   */
  handleDragMove(e) {
    if (!this.state.drag.isDragging || !this.state.drag.sidebar) return;

    // PDFビューアのcanvas要素やその親要素を除外（PDFの操作を優先）
    if (e.target && e.target.closest('canvas, .pdf-viewer, .pdf-viewer-container, .canvas-wrapper')) {
      this.state.drag.isDragging = false;
      return;
    }

    const touchY = e.touches ? e.touches[0].clientY : e.clientY;
    this.state.drag.currentY = touchY;

    // スクロール可能なコンテンツ内でのドラッグを再チェック
    const scrollable = this.state.drag.sidebar.querySelector('.lesson-list, .resources-list');
    if (scrollable) {
      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      const isScrollable = scrollHeight > clientHeight;
      const deltaY = touchY - this.state.drag.startY;

      // スクロール可能なコンテンツがある場合，コンテンツのスクロールを優先
      if (isScrollable) {
        if (scrollTop > 0) {
          // スクロールが最上部でない場合，上方向へのドラッグは無効化
          if (deltaY <= 0) {
            this.state.drag.isDragging = false;
            return;
          }
        }
      }
    }

    // ドラッグ距離を計算
    const deltaY = touchY - this.state.drag.startY;
    // 上方向へのドラッグは -50px までに制限（自然な操作感）
    const maxUpward = -50;
    const finalDeltaY = Math.max(maxUpward, deltaY);

    // ボトムシートを指の位置に追従
    this.state.drag.sidebar.style.transform = `translateY(${finalDeltaY}px)`;
    this.state.drag.sidebar.style.transition = 'none'; // ドラッグ中はアニメーションを無効化

    // 速度を計算（高速スワイプ検知のため）
    // px/ms 単位で計算し，閉じる判定に使用する
    const currentTime = Date.now();
    const timeDelta = currentTime - this.state.drag.lastTime;
    if (timeDelta > 0) {
      const distanceDelta = touchY - this.state.drag.lastY;
      this.state.drag.velocity = distanceDelta / timeDelta;
    }

    this.state.drag.lastY = touchY;
    this.state.drag.lastTime = currentTime;

    // 背景のスクロールを防止
    if (e.cancelable) e.preventDefault();
  }

  /**
   * ドラッグ終了時の処理
   * 
   * ドラッグ距離と速度を考慮して，ボトムシートを閉じるか元の位置に戻すかを決定します。
   * 
   * 閉じる条件:
   * - 下方向へのドラッグ距離が 100px 以上
   * - または，下方向へのドラッグ距離が 50px 以上で，高速スワイプ（速度 > 0.5px/ms）
   * 
   * @param {Event} e - タッチ/マウスイベント
   */
  handleDragEnd(e) {
    if (!this.state.drag.isDragging || !this.state.drag.sidebar) return;

    const deltaY = this.state.drag.currentY - this.state.drag.startY;
    
    // 速度による判定: 高速で下方向にスワイプした場合
    const shouldCloseByVelocity = Math.abs(this.state.drag.velocity) > this.CONSTANTS.VELOCITY_THRESHOLD && this.state.drag.velocity > 0;
    // 距離と速度の両方を考慮した閉じる判定
    const shouldClose = deltaY > this.CONSTANTS.SWIPE_CLOSE_THRESHOLD || (deltaY > 50 && shouldCloseByVelocity);

    if (shouldClose) {
      // 閉じるアニメーション
      this.closeBottomSheet();
    } else {
      // 元の位置に戻すアニメーション
      this.state.drag.sidebar.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)';
      this.state.drag.sidebar.style.transform = 'translateY(0)';
      
      setTimeout(() => {
        if (this.state.drag.sidebar) {
          // アニメーション完了後の処理（必要に応じて）
        }
      }, 300);
    }

    // ドラッグ状態をリセット
    this.state.drag.isDragging = false;
    this.state.drag.sidebar = null;
  }

  // ============================================================================
  // モバイル版: 画面外タップ処理
  // ============================================================================

  /**
   * 画面外タップ時の処理
   * 
   * ボトムシート以外の領域（動画エリアなど）をタップした時に，
   * ボトムシートを閉じます。
   * 
   * ただし，以下の場合は閉じません:
   * - ボトムシート内をタップした場合
   * - モバイルアクションボタンをタップした場合
   * - YouTubeプレーヤー（iframe）内をタップした場合
   * - ボトムシートを開いた直後（400ms以内）のタップ
   * 
   * @param {Event} e - タッチ/マウスイベント
   */
  handleOutsideTap(e) {
    // デスクトップ版では無効
    if (window.innerWidth > this.CONSTANTS.MOBILE_BREAKPOINT) return;
    // ボトムシートを開いた直後は無視（意図しないタップを防止）
    if (this.state.justOpenedBottomSheet) return;

    // ボトムシートが開いていない場合は何もしない
    const isOpen = Array.from(this.elements.sidebars).some(s => s.classList.contains('bottom-sheet-active'));
    if (!isOpen) return;

    const target = e.target;
    
    // ボトムシート内の要素をタップした場合は閉じない
    if (target.closest('.player-sidebar-left.bottom-sheet-active, .player-sidebar-right.bottom-sheet-active')) return;
    // モバイルアクションボタンをタップした場合も閉じない
    if (target.closest('.mobile-action-btn, .mobile-actions')) return;

    // 画面外の領域（動画エリアなど）をタップした場合
    const isOutside = target.closest('.player-main, header, .video-container, .video-description');
    if (isOutside) {
      // YouTubeプレーヤー（iframe）内をタップした場合は閉じない
      // （再生/一時停止などの操作を優先）
      const isIframe = target.closest('iframe') || target.tagName === 'IFRAME';
      if (!isIframe) {
        this.closeBottomSheet();
      }
    }
  }
}

// ============================================================================
// グローバル名前空間へのエクスポート
// ============================================================================

/**
 * PlayerUI クラスをグローバル名前空間にエクスポート
 * 
 * window.KouTech.PlayerUI としてアクセス可能になります。
 * player.js など他のスクリプトから利用できます。
 */
window.KouTech = window.KouTech || {};
window.KouTech.PlayerUI = PlayerUI;

