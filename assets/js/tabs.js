// タブ機能のJavaScript

document.addEventListener('DOMContentLoaded', function() {
  // タブ要素を取得
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // 各タブにクリックイベントを追加
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', function() {
      // すべてのタブとコンテンツからactiveクラスを削除
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // クリックされたタブと対応するコンテンツにactiveクラスを追加
      tab.classList.add('active');
      if (tabContents[index]) {
        tabContents[index].classList.add('active');
      }
    });
  });
  
  // 最初のタブをアクティブにする（デフォルト）
  if (tabs.length > 0 && tabContents.length > 0) {
    tabs[0].classList.add('active');
    tabContents[0].classList.add('active');
  }
});

