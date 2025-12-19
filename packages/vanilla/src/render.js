import { cartStore, productStore, uiStore } from "./stores";
import { router } from "./router";
import { HomePage, NotFoundPage, ProductDetailPage } from "./pages";
import { withBatch } from "./utils";

// 홈 페이지 (상품 목록)
router.addRoute("/", HomePage);
router.addRoute("/product/:id/", ProductDetailPage);
router.addRoute(".*", NotFoundPage);

/**
 * 전체 애플리케이션 렌더링
 */
export const render = withBatch(() => {
  const rootElement = document.getElementById("root");
  if (!rootElement) return;

  const PageComponent = router.target;

  // App 컴포넌트 렌더링
  rootElement.innerHTML = PageComponent();

  // [추가] 페이지 변경 시 타이틀 업데이트 함수 호출
  updateTitle(PageComponent);
});

// [추가] 타이틀 비동기 업데이트 로직
async function updateTitle(Component) {
  // 컴포넌트에 getTitle 메서드가 없으면 무시
  if (!Component || typeof Component.getTitle !== "function") return;

  try {
    // 라우터에서 현재 파라미터(id 등)와 쿼리 스트링 가져오기
    const params = router.params || {};
    const query = router.query || {};

    // getTitle 실행하여 제목 가져오기
    const title = await Component.getTitle({ ...params, ...query });

    // 문서 타이틀 변경
    if (title) {
      console.log(title);
      document.title = title;
    }
  } catch (error) {
    console.error("페이지 타이틀 업데이트 실패:", error);
  }
}

/**
 * 렌더링 초기화 - Store 변화 감지 설정
 */
export function initRender() {
  // 각 Store의 변화를 감지하여 자동 렌더링
  productStore.subscribe(render);
  cartStore.subscribe(render);
  uiStore.subscribe(render);
  router.subscribe(render);
}
