import { getCategories, getProduct, getProducts } from "../api/productApi.js";
import { initialProductState, productStore, PRODUCT_ACTIONS } from "../stores/index.js";
import { router } from "../router/router.js";

/**
 * [ISOMORPHIC] 상품 목록 및 카테고리 로드
 */
export const loadProductsAndCategories = async (serverQuery = null, serverStore = null) => {
  const targetStore = serverStore || productStore;
  let targetQuery;

  if (serverQuery) {
    targetQuery = { ...serverQuery, current: undefined };
  } else {
    // [수정] router.query 초기화 시 기존 파라미터 보존 여부 확인 필요하나, 초기 로드이므로 리셋
    router.query = { current: undefined };
    targetQuery = router.query;
  }

  targetStore.dispatch({
    type: PRODUCT_ACTIONS.SETUP,
    payload: { ...initialProductState, loading: true, status: "pending" },
  });

  try {
    const [
      {
        products,
        pagination: { total },
      },
      categories,
    ] = await Promise.all([getProducts(targetQuery), getCategories()]);

    targetStore.dispatch({
      type: PRODUCT_ACTIONS.SETUP,
      payload: { products, categories, totalCount: total, loading: false, status: "done" },
    });
  } catch (error) {
    targetStore.dispatch({ type: PRODUCT_ACTIONS.SET_ERROR, payload: error.message });
    throw error;
  }
};

/**
 * [CSR] 상품 목록 로드 (새로고침)
 */
export const loadProducts = async (resetList = true) => {
  try {
    productStore.dispatch({
      type: PRODUCT_ACTIONS.SETUP,
      payload: { loading: true, status: "pending", error: null },
    });

    // router.query는 checkRoutes()에 의해 URL과 동기화된 상태입니다.
    const {
      products,
      pagination: { total },
    } = await getProducts(router.query);
    const payload = { products, totalCount: total };

    if (resetList) {
      productStore.dispatch({ type: PRODUCT_ACTIONS.SET_PRODUCTS, payload });
    } else {
      productStore.dispatch({ type: PRODUCT_ACTIONS.ADD_PRODUCTS, payload });
    }
  } catch (error) {
    productStore.dispatch({ type: PRODUCT_ACTIONS.SET_ERROR, payload: error.message });
    throw error;
  }
};

/**
 * [CSR] 더보기 (무한 스크롤)
 * - 이 함수는 URL을 변경하지 않고 내부 상태만 변경하여 다음 페이지를 가져옵니다.
 * - HomePage의 watcher는 'current'를 감시하지 않으므로 전체 리로드(loading:true)가 발생하지 않습니다.
 */
export const loadMoreProducts = async () => {
  const state = productStore.getState();
  const hasMore = state.products.length < state.totalCount;

  if (!hasMore || state.loading) return;

  // 현재 쿼리에 페이지 번호만 증가시킴 (URL 업데이트 안 함 = 히스토리 오염 방지)
  router.query = { ...router.query, current: Number(router.query.current ?? 1) + 1 };
  await loadProducts(false);
};

// ▼▼▼▼▼▼ [핵심 수정: URL 업데이트 헬퍼 함수] ▼▼▼▼▼▼

/**
 * 쿼리 파라미터를 업데이트하고 URL을 변경하는 내부 유틸리티
 */
const updateQuery = (newParams) => {
  // 1. 기존 쿼리 파라미터 유지
  const currentQuery = router.query || {};
  const mergedQuery = { ...currentQuery, ...newParams };

  // 2. URLSearchParams 생성 (undefined, null, 빈 문자열 제거)
  const searchParams = new URLSearchParams();
  Object.entries(mergedQuery).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value);
    }
  });

  // 3. 라우터 push -> checkRoutes -> render -> HomePage watcher 감지 -> loadProducts 실행
  router.push(`/?${searchParams.toString()}`);
};

/**
 * [CSR] 검색어 설정
 */
export const searchProducts = (search) => {
  updateQuery({ search, current: 1 });
};

/**
 * [CSR] 카테고리 설정
 */
export const setCategory = (categoryData) => {
  // categoryData: { category1: '...', category2: '...' }
  // 카테고리 변경 시 페이지 1로 초기화
  updateQuery({ ...categoryData, current: 1 });
};

/**
 * [CSR] 정렬 설정
 */
export const setSort = (sort) => {
  updateQuery({ sort, current: 1 });
};

/**
 * [CSR] 페이지당 개수 설정
 */
export const setLimit = (limit) => {
  updateQuery({ limit, current: 1 });
};

// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

/**
 * [ISOMORPHIC] 상품 상세 페이지 로드
 */
export const loadProductDetailForPage = async (productId, serverStore = null) => {
  const targetStore = serverStore || productStore;

  try {
    const currentProduct = targetStore.getState().currentProduct;
    // CSR 최적화: 이미 불러온 상품이면 다시 부르지 않음 (관련 상품만 체크)
    if (!serverStore && productId === currentProduct?.productId) {
      if (currentProduct.category2) {
        await loadRelatedProducts(currentProduct.category2, productId, targetStore);
      }
      return;
    }

    targetStore.dispatch({
      type: PRODUCT_ACTIONS.SETUP,
      payload: { ...initialProductState, currentProduct: null, loading: true, status: "pending" },
    });

    const product = await getProduct(productId);

    targetStore.dispatch({ type: PRODUCT_ACTIONS.SET_CURRENT_PRODUCT, payload: product });

    if (product.category2) {
      await loadRelatedProducts(product.category2, productId, targetStore);
    }
  } catch (error) {
    targetStore.dispatch({ type: PRODUCT_ACTIONS.SET_ERROR, payload: error.message });
    throw error;
  }
};

/**
 * [Helper] 관련 상품 로드
 */
export const loadRelatedProducts = async (category2, excludeProductId, serverStore = null) => {
  const targetStore = serverStore || productStore;
  try {
    const params = { category2, limit: 20, page: 1 };
    const response = await getProducts(params);
    const relatedProducts = response.products.filter((p) => p.productId !== excludeProductId);

    targetStore.dispatch({ type: PRODUCT_ACTIONS.SET_RELATED_PRODUCTS, payload: relatedProducts });
  } catch (error) {
    targetStore.dispatch({ type: PRODUCT_ACTIONS.SET_RELATED_PRODUCTS, payload: [] });
  }
};