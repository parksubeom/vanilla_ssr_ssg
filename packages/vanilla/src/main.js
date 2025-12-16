import { registerGlobalEvents } from "./utils/index.js";
import { initRender } from "./render.js";
import { registerAllEvents } from "./events.js";
import { loadCartFromStorage } from "./services/index.js";
import { BASE_URL } from "./constants.js";
import { router } from "./router/router.js";
import { registerRoutes } from "./router/routes.js";

function main() {
  // 라우트 등록 실행
  registerRoutes(router);

  registerAllEvents();
  registerGlobalEvents();
  loadCartFromStorage();
  initRender();
  router.start();
}

/**
 * [수정 포인트]
 * import.meta.env 가 없을 수도 있으므로 '?.MODE' (옵셔널 체이닝) 사용!
 * (Node.js 서버에서 직접 띄울 땐 env가 undefined이므로 에러 방지)
 */
if (import.meta.env?.MODE !== "test") {
  import("./mocks/browser.js")
    .then(({ worker }) => {
      worker.start({
        serviceWorker: {
          url: `${BASE_URL}mockServiceWorker.js`,
        },
        onUnhandledRequest: "bypass",
      })
      .then(() => {
        // [중요] 워커 시작 완료 후 main 실행
        main();
      })
      .catch((err) => {
        // 워커 시작 실패 시에도 앱은 켜져야 함
        console.warn("MSW Worker start failed:", err);
        main();
      });
    })
    .catch((err) => {
      // browser.js 임포트 실패 시에도 앱은 켜져야 함
      console.warn("Mock Service Worker load failed:", err);
      main();
    });
} else {
  main();
}