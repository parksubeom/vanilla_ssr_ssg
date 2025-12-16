import { http, HttpResponse } from "msw";
// [수정 1] JSON 파일을 읽기 위해 Node.js 내장 모듈 사용
import { createRequire } from "module";

// [수정 2] ESM 환경(Node.js)에서 JSON을 import 하기 위한 require 생성
const require = createRequire(import.meta.url);
const items = require("./items.json");

const delay = async () => await new Promise((resolve) => setTimeout(resolve, 200));

// 카테고리 추출 함수
function getUniqueCategories() {
  const categories = {};

  items.forEach((item) => {
    const cat1 = item.category1;
    const cat2 = item.category2;

    if (!categories[cat1]) categories[cat1] = {};
    if (cat2 && !categories[cat1][cat2]) categories[cat1][cat2] = {};
  });

  return categories;
}

// 상품 검색 및 필터링 함수
function filterProducts(products, query) {
  let filtered = [...products];

  // 검색어 필터링
  if (query.search) {
    const searchTerm = query.search.toLowerCase();
    filtered = filtered.filter(
      (item) => item.title.toLowerCase().includes(searchTerm) || item.brand.toLowerCase().includes(searchTerm),
    );
  }

  // 카테고리 필터링
  if (query.category1) {
    filtered = filtered.filter((item) => item.category1 === query.category1);
  }
  if (query.category2) {
    filtered = filtered.filter((item) => item.category2 === query.category2);
  }

  // 정렬
  if (query.sort) {
    switch (query.sort) {
      case "price_asc":
        filtered.sort((a, b) => parseInt(a.lprice) - parseInt(b.lprice));
        break;
      case "price_desc":
        filtered.sort((a, b) => parseInt(b.lprice) - parseInt(a.lprice));
        break;
      case "name_asc":
        filtered.sort((a, b) => a.title.localeCompare(b.title, "ko"));
        break;
      case "name_desc":
        filtered.sort((a, b) => b.title.localeCompare(a.title, "ko"));
        break;
      default:
        // 기본은 가격 낮은 순
        filtered.sort((a, b) => parseInt(a.lprice) - parseInt(b.lprice));
    }
  }

  return filtered;
}

export const handlers = [
  // 상품 목록 API
  // [수정] 상품 목록 API (디버깅 추가)
  http.get("*/api/products", async ({ request }) => {
    try {
      // 1. 요청이 들어왔는지 확인
      console.log("[MSW] GET /api/products 요청 수신");
      
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get("page") ?? url.searchParams.get("current")) || 1;
      const limit = parseInt(url.searchParams.get("limit")) || 20;
      const search = url.searchParams.get("search") || "";
      const category1 = url.searchParams.get("category1") || "";
      const category2 = url.searchParams.get("category2") || "";
      const sort = url.searchParams.get("sort") || "price_asc";

      // 2. items 데이터 확인
      if (!Array.isArray(items)) {
        console.error("[MSW Error] items가 배열이 아닙니다:", items);
        throw new Error("items data is not an array");
      }

      // 필터링
      const filteredProducts = filterProducts(items, {
        search,
        category1,
        category2,
        sort,
      });

      // 페이지네이션
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

      const response = {
        products: paginatedProducts,
        pagination: {
          page,
          limit,
          total: filteredProducts.length,
          totalPages: Math.ceil(filteredProducts.length / limit),
          hasNext: endIndex < filteredProducts.length,
          hasPrev: page > 1,
        },
        filters: { search, category1, category2, sort },
      };

      await delay();
      return HttpResponse.json(response);

    } catch (error) {
      // [핵심] 에러 내용을 서버 터미널에 출력
      console.error("[MSW Handler Error] 핸들러 내부 에러 발생:", error);
      return HttpResponse.json({ error: error.message }, { status: 500 });
    }
  }),

  // 상품 상세 API
  http.get("*/api/products/:id", ({ params }) => {
    const { id } = params;
    const product = items.find((item) => item.productId === id);

    if (!product) {
      return HttpResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // 상세 정보에 추가 데이터 포함
    const detailProduct = {
      ...product,
      description: `${product.title}에 대한 상세 설명입니다. ${product.brand} 브랜드의 우수한 품질을 자랑하는 상품으로, 고객 만족도가 높은 제품입니다.`,
      rating: Math.floor(Math.random() * 2) + 4, // 4~5점 랜덤
      reviewCount: Math.floor(Math.random() * 1000) + 50, // 50~1050개 랜덤
      stock: Math.floor(Math.random() * 100) + 10, // 10~110개 랜덤
      images: [product.image, product.image.replace(".jpg", "_2.jpg"), product.image.replace(".jpg", "_3.jpg")],
    };

    return HttpResponse.json(detailProduct);
  }),

  // 카테고리 목록 API
  http.get("*/api/categories", async () => {
    const categories = getUniqueCategories();
    await delay();
    return HttpResponse.json(categories);
  }),
];