// src/lib/Router.js

export class Router {
  constructor(baseUrl = "") {
    this.routes = [];
    this.target = null;
    this.subscribers = [];
    // BASE_URL 정규화: 항상 끝에 '/'가 붙도록 함
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

    if (typeof window !== "undefined") {
      window.onpopstate = () => this.checkRoutes();
    }
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    // 초기 렌더링 시 target이 있다면 알림
    if (this.target && typeof window !== "undefined") {
      callback();
    }
  }

  notify() {
    this.subscribers.forEach((callback) => callback());
  }

  addRoute(pattern, component) {
    this.routes.push({ pattern, component });
    return this;
  }

  /**
   * [SSR & CSR 공용] URL 매칭 로직
   * - server.js에서 req.path를 바로 넘겨도 처리될 수 있도록 
   * 여기서 트레일링 슬래시를 제거해야 합니다.
   */
  match(path) {
    // [핵심 수정] 입력받은 path의 끝에 '/'가 있다면 제거하여 정규화
    // 예: '/product/123/' -> '/product/123'
    const pathForMatch = (path !== "/" && path.endsWith("/")) 
      ? path.slice(0, -1) 
      : path;

    for (const route of this.routes) {
      // 정규식 매칭 로직: :id 등을 ([^/]+)로 치환하여 매칭
      const regex = new RegExp(`^${route.pattern.replace(/:\w+/g, "([^/]+)")}$`);
      const match = pathForMatch.match(regex);

      if (match) {
        const params = this._getParams(route.pattern, match);
        return { component: route.component, params, pattern: route.pattern };
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

  checkRoutes() {
    if (typeof window === "undefined") return;

    const rawPath = window.location.pathname;
    let currentPath;

    // 1. Base URL 제거
    if (rawPath.startsWith(this.baseUrl)) {
      currentPath = rawPath.substring(this.baseUrl.length);
    } else {
      currentPath = rawPath;
    }

    // 2. 경로 정규화 (BaseURL 제거 후 처리)
    let pathForMatch =
      currentPath === "" || currentPath === "/"
        ? "/"
        : `/${currentPath.replace(/^\//, "")}`;

    // *[수정]* 여기 있던 트레일링 슬래시 제거 로직은 match() 내부로 이동하여 
    // 중복을 제거하고 SSR 호환성을 확보했습니다.

    const match = this.match(pathForMatch);

    if (match) {
      this.target = match.component;
      this.query = this._parseQuery();
      this.params = match.params;
      this.notify();
    } else {
      // 404 처리
      const notFoundMatch = this.match(".*");
      if (notFoundMatch) {
        this.target = notFoundMatch.component;
        this.params = {};
        this.query = this._parseQuery();
        this.notify();
      } else {
        this.target = null;
        this.notify();
      }
    }
  }

  _parseQuery() {
    if (typeof window === "undefined") return {};
    const search = new URLSearchParams(window.location.search);
    return Object.fromEntries(search.entries());
  }

  start() {
    if (typeof window !== "undefined") {
      this.checkRoutes();
    }
  }

  push(path) {
    if (typeof window !== "undefined") {
      // path가 '/'로 시작하면 첫 '/'를 제거하고 BASE_URL과 합칩니다.
      const pathWithoutLeadingSlash = path.startsWith("/")
        ? path.substring(1)
        : path;
      
      const targetPath = `${this.baseUrl}${pathWithoutLeadingSlash}`;

      window.history.pushState(null, "", targetPath);
      this.checkRoutes();
    }
  }
}