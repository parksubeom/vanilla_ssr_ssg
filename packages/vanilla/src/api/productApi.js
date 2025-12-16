// [핵심] 서버(SSR)에서는 절대 경로가 필요하고, 브라우저(CSR)는 상대 경로를 씁니다.
// 만약 실제 백엔드 API 서버가 따로 있다면 "http://localhost:5174" 대신 그 주소를 적어야 합니다.
const API_HOST = typeof window === "undefined" ? "http://localhost:5174" : "";

export async function getProducts(params = {}) {
  const { limit = 20, search = "", category1 = "", category2 = "", sort = "price_asc" } = params;
  const page = params.current ?? params.page ?? 1;

  const searchParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
    ...(category1 && { category1 }),
    ...(category2 && { category2 }),
    sort,
  });

  // [수정] URL 앞에 API_HOST 추가
  const response = await fetch(`${API_HOST}/api/products?${searchParams}`);

  if (!response.ok) {
    throw new Error(`API Call Failed: ${response.status}`);
  }
  
  return await response.json();
}

export async function getProduct(productId) {
  // [수정] URL 앞에 API_HOST 추가
  const response = await fetch(`${API_HOST}/api/products/${productId}`);
  
  if (!response.ok) {
    throw new Error(`API Call Failed: ${response.status}`);
  }

  return await response.json();
}

export async function getCategories() {
  // [수정] URL 앞에 API_HOST 추가
  const response = await fetch(`${API_HOST}/api/categories`);
  
  if (!response.ok) {
    throw new Error(`API Call Failed: ${response.status}`);
  }

  return await response.json();
}