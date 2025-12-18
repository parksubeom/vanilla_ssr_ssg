// server.js

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import "cross-fetch/dist/node-polyfill.js"; // [중요] fetch 폴리필 추가 (Node 18+에서는 내장이지만 명시적 확인)

// [App Logic]
import { createStore } from "./src/lib/createStore.js";
import { Router } from "./src/lib/Router.js";
import { registerRoutes } from "./src/router/routes.js";
import { router as globalRouter } from "./src/router/router.js";
import { productReducer } from "./src/stores/productStore.js";
import { cartReducer } from "./src/stores/cartStore.js";

// [MSW 설정]
import { setupServer } from 'msw/node';
import { handlers } from './src/mocks/handlers.js'; 

// [수정 1: MSW 서버 인스턴스 생성 및 실행]
const mswServer = setupServer(...handlers);

// [중요] MSW 실행: onUnhandledRequest를 'bypass'로 설정하여
// MSW가 처리하지 않는 요청은 그대로 통과시켜 Express가 처리하도록 함.
mswServer.listen({ onUnhandledRequest: 'bypass' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;
const app = express();

app.use("/src", express.static(path.join(__dirname, "src")));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.static(path.join(__dirname, "public")));

const renderHtml = ({ content, state }) => {
  const safeState = state || {}; 
  const stateJson = JSON.stringify(safeState) || '{}';

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vanilla Javascript Shopping Mall</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root">${content}</div>
  <script>
    window.__INITIAL_STATE__ = ${stateJson.replace(/</g, '\\u003c')};
  </script>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`.trim();
};

const rootReducer = (state = {}, action) => {
  return {
    product: productReducer(state.product, action),
    cart: cartReducer(state.cart, action),
  };
};

// [수정 2: API 요청 필터링 (Express 5 대응)]
// Express 5에서는 '/api/*' 와 같은 문법이 에러를 유발합니다.
// 대신 정규표현식을 사용하여 /api/ 로 시작하는 모든 요청을 잡아냅니다.
app.all(/^\/api\/.*/, (req, res) => {
    // MSW가 이 요청을 가로채지 못하고 여기까지 왔다면, 
    // 핸들러가 없거나 매칭이 안 된 것입니다.
    // HTML 대신 404 JSON을 반환하여 클라이언트(fetch)가 '<' 에러를 내지 않도록 합니다.
    console.warn(`[SSR Server] Unhandled API request: ${req.method} ${req.url}`);
    res.status(404).json({ 
        error: "API Route Not Found (Likely MSW Miss)", 
        path: req.url 
    });
});

// [수정 3: SSR 렌더링 라우트]
// 모든 페이지 요청을 처리합니다.
app.get(/.*/, async (req, res) => {
  try {
    const store = createStore(rootReducer);
    const router = new Router(""); 
    registerRoutes(router);

    const match = router.match(req.path);
    if (!match) return res.status(404).send("Page Not Found");

    const { component: Component, params } = match;

    globalRouter.query = req.query;
    globalRouter.params = params;

    if (Component.fetchData) {
      await Component.fetchData({
        store,
        params,
        query: req.query
      });
    }

    const content = Component();
    const initialState = store.getState();
    const html = renderHtml({ content, state: initialState });

    res.send(html);

  } catch (err) {
    console.error("SSR Rendering Error:", err);
    res.status(500).send(err.stack);
  }
});

app.listen(port, () => {
  console.log(`🛒 SSR Server running at http://localhost:${port}`);
});