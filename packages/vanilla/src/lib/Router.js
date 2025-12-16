export class Router {
  constructor() {
    this.routes = [];
    
    // [수정 포인트 1] 서버(Node.js)에서는 window가 없으므로 체크해야 함!
    // 브라우저일 때만 뒤로가기(popstate) 이벤트를 감지
    if (typeof window !== "undefined") {
      window.onpopstate = () => this.checkRoutes();
    }
  }

  addRoute(pattern, component) {
    this.routes.push({ pattern, component });
    return this;
  }

  /**
   * [SSR & CSR 공용] URL과 일치하는 라우트 찾기
   */
  match(path) {
    for (const route of this.routes) {
      // 정규표현식 패턴 처리
      const regex = new RegExp(`^${route.pattern.replace(/:\w+/g, "([^/]+)")}$`);
      const match = path.match(regex);

      if (match) {
        // URL 파라미터 추출 (예: /product/123 -> { id: "123" })
        const params = this._getParams(route.pattern, match);
        return { component: route.component, params };
      }
    }
    return null;
  }

  _getParams(pattern, match) {
    const params = {};
    const keys = pattern.match(/:\w+/g);
    if (keys) {
      keys.forEach((key, index) => {
        params[key.substring(1)] = match[index + 1];
      });
    }
    return params;
  }

  /**
   * [CSR 전용] 라우팅 실행
   */
  checkRoutes() {
    // [수정 포인트 2] 서버에서는 실행 안 함
    if (typeof window === "undefined") return;

    const currentPath = window.location.pathname;
    const match = this.match(currentPath);

    if (match) {
      // 컴포넌트 렌더링은 main.js의 렌더러가 담당하거나, 
      // 여기서 이벤트를 발생시켜야 함. 
      // 기존 로직에 맞춰서 유지 (보통 여기서 render 함수를 부르지 않고 상태만 변경)
      this.query = this._parseQuery(); // 쿼리 파싱
      this.params = match.params;
    }
  }

  _parseQuery() {
    if (typeof window === "undefined") return {};
    const search = new URLSearchParams(window.location.search);
    return Object.fromEntries(search.entries());
  }

  start() {
    // [수정 포인트 3] 서버 무시
    if (typeof window !== "undefined") {
      this.checkRoutes();
    }
  }

  push(path) {
    // [수정 포인트 4] 서버 무시
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", path);
      this.checkRoutes();
    }
  }
}

// [중요] 기존 코드와 호환성을 위해 싱글톤 인스턴스도 내보냅니다.
// 서버는 new Router()를 따로 해서 쓰고, 클라이언트는 이 router를 씁니다.
export const router = new Router();