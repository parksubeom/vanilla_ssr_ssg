import { Router } from "../lib/Router.js";
import { BASE_URL } from "../constants.js";

// [수정] 서버에서도 router 인스턴스가 생성되어야 합니다.
// (그래야 server.js에서 router.query 등을 주입할 수 있음)
export const router = new Router(BASE_URL);