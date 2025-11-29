/**
 * KouTech Video Player Logic (Unified Course Data)
 * Loads unified course_data.json and displays videos by subject and unit
 */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const subjectParam = urlParams.get('subject');
  const unitParam = urlParams.get('unit');
  let currentVideoNumber = parseInt(urlParams.get('video')) || 1;
  
  const elements = {
    videoContainer: document.querySelector('.video-container'),
    lessonList: document.getElementById('lesson-list'),
    sidebarTitle: document.getElementById('sidebar-title'),
    resourcesList: document.getElementById('resources-list')
  };

  let allCourseData = null;
  let currentUnitData = null;
  let player = null;

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
            videos: unit.videos
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
    if (elements.sidebarTitle && currentUnitData) {
      elements.sidebarTitle.textContent = `${currentUnitData.subject_name} ${currentUnitData.unit_name}`;
    }
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
      
      item.innerHTML = `
        <div class="lesson-status"></div>
        <div class="lesson-info">
          <span class="lesson-title">${video.video_number}. ${video.title}${isNotReady ? ' <span style="color:var(--text-sub); font-size:0.8rem;">(準備中)</span>' : ''}</span>
          <span class="lesson-duration">${video.duration || '--:--'}</span>
        </div>
      `;
      elements.lessonList.appendChild(item);
    });
  }


  function renderResources(video) {
    elements.resourcesList.innerHTML = '';
    
    // Add Link to Lesson Log
    if (video.log_link) {
      const link = document.createElement('a');
      link.href = video.log_link;
      link.className = 'resource-link';
      link.innerHTML = `<span class="resource-icon">📄</span> 授業ログを見る`;
      elements.resourcesList.appendChild(link);
    }

    // Google Drive link (準備中)
    const driveLink = document.createElement('div');
    driveLink.className = 'resource-link';
    driveLink.style.cursor = 'default';
    driveLink.style.opacity = '0.6';
    driveLink.innerHTML = `<span class="resource-icon">📁</span> 講義資料 (準備中)`;
    elements.resourcesList.appendChild(driveLink);
  }

  function findVideoByNumber(videoNumber) {
    return currentUnitData.videos.find(v => v.video_number === videoNumber) || null;
  }
});
