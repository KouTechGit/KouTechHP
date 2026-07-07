/**
 * KouTech 動画視聴進捗ストア
 *
 * 動画の再生位置・視聴完了状態を localStorage に保存し，
 * 「続きから再生」や進捗マップ（progress-map.js）から参照される共通データストアです。
 */
class ProgressStore {
  static STORAGE_KEY = 'koutech-progress-v1';
  static COMPLETE_RATIO = 0.9;
  static MIN_RESUME_POSITION = 5;
  static MAX_RESUME_RATIO = 0.95;

  static _key(subject, unit, videoNumber) {
    return `${subject}|${unit}|${videoNumber}`;
  }

  static _readAll() {
    try {
      const raw = localStorage.getItem(ProgressStore.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_e) {
      return {};
    }
  }

  static _writeAll(data) {
    try {
      localStorage.setItem(ProgressStore.STORAGE_KEY, JSON.stringify(data));
    } catch (_e) { /* localStorage 無効時は無視 */ }
  }

  /**
   * 指定した動画の進捗エントリを取得します。
   * @returns {{position:number, duration:number, completed:boolean, updatedAt:string}|null}
   */
  static get(subject, unit, videoNumber) {
    const all = ProgressStore._readAll();
    return all[ProgressStore._key(subject, unit, videoNumber)] || null;
  }

  /**
   * 再生位置を保存します。duration に対する position の割合が
   * COMPLETE_RATIO 以上の場合，自動的に完了扱いになります。
   */
  static save(subject, unit, videoNumber, { position, duration }) {
    const all = ProgressStore._readAll();
    const completed = duration > 0 && position / duration >= ProgressStore.COMPLETE_RATIO;
    all[ProgressStore._key(subject, unit, videoNumber)] = {
      position,
      duration,
      completed,
      updatedAt: new Date().toISOString()
    };
    ProgressStore._writeAll(all);
  }

  /**
   * 保存済みの位置から再生を再開すべきかどうかを判定します。
   * （視聴開始直後や，ほぼ最後まで見ている場合は再開しない）
   */
  static shouldResume(entry) {
    if (!entry || !entry.duration) return false;
    return entry.position > ProgressStore.MIN_RESUME_POSITION &&
           entry.position < entry.duration * ProgressStore.MAX_RESUME_RATIO;
  }

  /**
   * 単元内の視聴完了数を集計します。
   * @param {number} videoCount - 単元の総動画数
   * @returns {{completed:number, total:number}}
   */
  static getUnitStats(subject, unit, videoCount) {
    let completed = 0;
    for (let i = 1; i <= videoCount; i++) {
      const entry = ProgressStore.get(subject, unit, i);
      if (entry && entry.completed) completed++;
    }
    return { completed, total: videoCount };
  }
}

window.KouTech = window.KouTech || {};
window.KouTech.ProgressStore = ProgressStore;
