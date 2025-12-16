import { ProductList, SearchBar } from "../components/index.js";
import { productStore } from "../stores/index.js";
import { router, withLifecycle } from "../router/index.js"; // 경로 명시
import { loadProducts, loadProductsAndCategories } from "../services/index.js";
import { PageWrapper } from "./PageWrapper.js";

const HomePageComponent = withLifecycle(
  {
    onMount: () => {
      loadProductsAndCategories();
    },
    watches: [
      () => {
        const { search, limit, sort, category1, category2 } = router.query;
        return [search, limit, sort, category1, category2];
      },
      () => loadProducts(true),
    ],
  },
  () => {
    const productState = productStore.getState();
    const { search: searchQuery, limit, sort, category1, category2 } = router.query;
    const { products, loading, error, totalCount, categories } = productState;
    const category = { category1, category2 };
    const hasMore = products.length < totalCount;

    return PageWrapper({
      headerLeft: `
        <h1 class="text-xl font-bold text-gray-900">
          <a href="/" data-link>쇼핑몰</a>
        </h1>
      `.trim(),
      children: `
        ${SearchBar({ searchQuery, limit, sort, category, categories })}
        
        <div class="mb-6">
          ${ProductList({
            products,
            loading,
            error,
            totalCount,
            hasMore,
          })}
        </div>
      `.trim(),
    });
  },
);

/**
 * [SSR 필수] 서버 사이드 데이터 프리패칭
 */
HomePageComponent.fetchData = async ({ store, query }) => {
  // 서비스를 통해 데이터를 가져오고 스토어에 주입합니다.
  await loadProductsAndCategories(query, store);
};

export const HomePage = HomePageComponent;