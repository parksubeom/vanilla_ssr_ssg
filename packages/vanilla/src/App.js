/**
 * [SSR용] HTML 템플릿 생성 함수
 * @param {Object} params
 * @param {string} params.content - 렌더링된 페이지 HTML
 * @param {Object} params.state - 서버에서 완성된 스토어 상태 (Dehydration용)
 * @param {string} params.url - 현재 URL (메타태그 등에 활용 가능)
 */
export const App = ({ content, state, url }) => {
  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Vanilla JS SSR Shopping Mall</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="/assets/style.css"> </head>
    <body>
      <div id="root">${content}</div>
      
      <script>
        window.__INITIAL_STATE__ = ${JSON.stringify(state).replace(/</g, '\\u003c')};
      </script>
      
      <script type="module" src="/src/main.js"></script>
    </body>
    </html>
  `;
};