import { getCategories, getProduct, getProducts } from "../api/productApi.js";
import { initialProductState, productStore, PRODUCT_ACTIONS } from "../stores/index.js";
import { router } from "../router/router.js"; // 경로 정확히 명시

/**
 * [ISOMORPHIC] 상품 목록 및 카테고리 로드
 * SSR 호환을 위해 serverQuery, serverStore를 주입받음
 */
export const loadProductsAndCategories = async (serverQuery = null, serverStore = null) => {
  const targetStore = serverStore || productStore;
  let targetQuery;

  if (serverQuery) {
    targetQuery = { ...serverQuery, current: undefined };
  } else {
    router.query = { current: undefined };
    targetQuery = router.query;
  }

  targetStore.dispatch({
    type: PRODUCT_ACTIONS.SETUP,
    payload: { ...initialProductState, loading: true, status: "pending" },
  });

  try {
    const [{ products, pagination: { total } }, categories] = await Promise.all([
      getProducts(targetQuery),
      getCategories()
    ]);

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

    const { products, pagination: { total } } = await getProducts(router.query);
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
 */
export const loadMoreProducts = async () => {
  const state = productStore.getState();
  const hasMore = state.products.length < state.totalCount;

  if (!hasMore || state.loading) return;

  router.query = { current: Number(router.query.current ?? 1) + 1 };
  await loadProducts(false);
};

// ▼▼▼▼▼▼ [여기서부터 누락되었던 CSR 헬퍼 함수들 복구] ▼▼▼▼▼▼

/**
 * [CSR] 검색어 설정
 */
export const searchProducts = (search) => {
  router.query = { search, current: 1 };
};

/**
 * [CSR] 카테고리 설정
 */
export const setCategory = (categoryData) => {
  router.query = { ...categoryData, current: 1 };
};

/**
 * [CSR] 정렬 설정
 */
export const setSort = (sort) => {
  router.query = { sort, current: 1 };
};

/**
 * [CSR] 페이지당 개수 설정
 */
export const setLimit = (limit) => {
  router.query = { limit, current: 1 };
};

// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

/**
 * [ISOMORPHIC] 상품 상세 페이지 로드
 */
export const loadProductDetailForPage = async (productId, serverStore = null) => {
  const targetStore = serverStore || productStore;

  try {
    const currentProduct = targetStore.getState().currentProduct;
    // CSR 최적화
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