/**
 * [ISOMORPHIC] 서버/클라이언트 호환 스토리지 생성기
 * * 스펙 요구사항:
 * - SSR 지원 (Node.js 환경)
 * - 장바구니 상태 localStorage 저장 (브라우저 환경)
 */
export const createStorage = (key, storageType = 'localStorage') => {
  // 1. 서버 환경 감지 (window 객체 부재)
  if (typeof window === 'undefined') {
    // 서버에서는 저장 기능이 필요 없으므로, 에러 방지용 '가짜(Mock) 객체'를 반환
    return {
      get: () => null,     // 조회 시 항상 데이터 없음
      set: () => {},       // 저장 시 아무 동작 안 함
      remove: () => {},    // 삭제 시 아무 동작 안 함
      clear: () => {}
    };
  }

  // 2. 클라이언트 환경 (브라우저)
  // 실제 window.localStorage 또는 sessionStorage 사용
  const storage = window[storageType];

  return {
    get: () => {
      try {
        const item = storage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (e) {
        console.warn(`[Storage] Read Error (${key}):`, e);
        return null;
      }
    },
    set: (value) => {
      try {
        storage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.warn(`[Storage] Write Error (${key}):`, e);
      }
    },
    remove: () => {
      try {
        storage.removeItem(key);
      } catch (e) {
        console.warn(`[Storage] Remove Error (${key}):`, e);
      }
    },
    clear: () => {
      try {
        storage.clear();
      } catch (e) {
        console.warn('[Storage] Clear Error:', e);
      }
    }
  };
};