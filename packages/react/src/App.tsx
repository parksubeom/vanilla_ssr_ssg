import { useEffect } from "react";
import { useCurrentPage } from "./router"; // [수정] useRouterContext 추가
import { useLoadCartStore } from "./entities";
import { ModalProvider, ToastProvider } from "./components";
import { useRouterContext } from "./router/hooks/useRouterContext";

const CartInitializer = () => {
  useLoadCartStore();
  return null;
};

/**
 * 전체 애플리케이션 렌더링
 */
export const App = () => {
  const PageComponent = useCurrentPage();
  // [추가] 라우터 정보를 가져오기 위해 훅 사용 (params, query 접근용)
  const router = useRouterContext();

  // [추가] 페이지 변경 시 타이틀(Metadata) 업데이트 로직
  useEffect(() => {
    if (!PageComponent) return;

    // 현재 렌더링된 페이지 컴포넌트에 getTitle 함수가 있는지 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getTitle = (PageComponent as any).getTitle;

    if (typeof getTitle === "function") {
      const updateTitle = async () => {
        try {
          // URL 파라미터(예: id)와 쿼리 스트링을 가져옴
          const params = router.params;
          const query = router.query;

          // getTitle 함수 실행 (params와 query 전달)
          const title = await getTitle({ ...params, ...query });

          // 문서 타이틀 업데이트
          if (title) {
            console.log(title);
            document.title = title;
          }
        } catch (error) {
          console.error("Failed to update title:", error);
        }
      };

      updateTitle();
    }
  }, [PageComponent, router]); // 페이지나 라우터 상태가 바뀔 때마다 실행

  return (
    <>
      <ToastProvider>
        <ModalProvider>{PageComponent ? <PageComponent /> : null}</ModalProvider>
      </ToastProvider>
      <CartInitializer />
    </>
  );
};
