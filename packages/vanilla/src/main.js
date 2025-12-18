import { registerGlobalEvents } from "./utils/index.js";
import { initRender } from "./render.js";
import { registerAllEvents } from "./events.js";
import { loadCartFromStorage } from "./services/index.js";
import { BASE_URL } from "./constants.js";
import { router } from "./router/router.js";
import { registerRoutes } from "./router/routes.js";

async function main() {
  // 1. 라우트 등록
  registerRoutes(router);

  // 2. 이벤트 등록 및 초기화
  registerAllEvents();
  registerGlobalEvents();
  loadCartFromStorage();

  // 3. 렌더링 시스템 초기화 (SSR 하이드레이션 포함)
  // Store가 __INITIAL_STATE__로 초기화되어 있으므로, 불필요한 fetch를 방지할 수 있습니다.
  initRender();

  // 4. 라우팅 시작 (초기 URL 매칭)
  router.start();
}

/**
 * MSW를 비동기로 준비하고 앱을 실행하는 부트스트랩 함수
 */
async function bootstrap() {
  // 브라우저 환경이고, 테스트 모드가 아닐 때만 MSW 실행 시도
  const shouldMock = typeof window !== 'undefined' && import.meta.env?.MODE !== "test";

  if (shouldMock) {
    try {
      // [중요] import 구문을 try-catch로 감싸서 모듈 로드 실패(SSR Dev 환경 등) 시 앱이 멈추지 않도록 함
      const { worker } = await import("./mocks/browser.js");

      await worker.start({
        serviceWorker: {
          url: `${BASE_URL}mockServiceWorker.js`,
        },
        // MSW가 처리하지 않는 요청(정적 파일 등)은 경고 없이 통과
        onUnhandledRequest: "bypass",
      });

      console.log("[MSW] Mock Service Worker started successfully");
    } catch (error) {
      // SSR 개발 환경(Express 정적 서빙)에서는 'msw/browser' 모듈 경로 해석이 안 되어 실패할 수 있음.
      // 이 경우, 경고만 남기고 앱을 계속 실행하여 '화면은 나오게' 처리합니다.
      console.warn("[MSW] Failed to start MSW (running without mocks):", error);
    }
  }

  // MSW 성공 여부와 관계없이 메인 로직 실행
  await main();
}

bootstrap();