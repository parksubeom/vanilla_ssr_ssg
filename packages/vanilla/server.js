import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// [App Logic]
import { createStore } from "./src/lib/createStore.js";
import { Router } from "./src/lib/Router.js";
import { registerRoutes } from "./src/router/routes.js";
import { router as globalRouter } from "./src/router/router.js";
import { productReducer } from "./src/stores/productStore.js";
import { cartReducer } from "./src/stores/cartStore.js";

// [추가 1] MSW Node.js 설정을 불러옵니다.
import { setupServer } from 'msw/node';
// [중요] handlers 경로가 맞는지 확인하세요! 보통 mocks/handlers.js 에 있습니다.
import { handlers } from './src/mocks/handlers.js'; 

// [추가 2] 서버용 MSW 인스턴스 생성 및 실행
// 이렇게 하면 fetch 요청이 네트워크로 나가지 않고 여기서 가로채집니다.
const mswServer = setupServer(...handlers);
mswServer.listen();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || 3000;
const app = express();

app.use("/src", express.static(path.join(__dirname, "src")));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.static(path.join(__dirname, "public")));

const renderHtml = ({ content, state }) => {
  // state가 없으면 빈 객체로 초기화하여 JSON.stringify 에러 방지
  const safeState = state || {}; 
  // JSON 문자열로 변환 (만약 변환 실패 시 빈 객체 문자열 '{}' 사용)
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

app.get(/\/src\/.*/, (req, res) => {
   res.status(404).end();
});

app.get(/.*\.(js|css|map|ico|png|jpg|json)$/, (req, res) => {
  res.status(404).end();
});
// 정규표현식 라우트 매칭
app.get(/.*/, async (req, res) => {
  try {
    const store = createStore(rootReducer);
    const router = new Router(); 
    registerRoutes(router);

    const match = router.match(req.path);
    if (!match) return res.status(404).send("Page Not Found");

    const { component: Component, params } = match;

    globalRouter.query = req.query;
    globalRouter.params = params;

    if (Component.fetchData) {
      // [핵심] 여기서 fetch가 호출될 때 mswServer가 가로채서 데이터를 줍니다!
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