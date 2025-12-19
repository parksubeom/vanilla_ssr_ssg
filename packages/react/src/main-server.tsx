import { renderToString } from "react-dom/server";
import { App } from "./App";
import type { StringRecord } from "@hanghae-plus/lib";
import { getCategories, getProduct, getProducts } from "./api/productApi";
import { PRODUCT_ACTIONS, productStore } from "./entities";
import { createRouter, type RouterType } from "./router";
import { RouterContext } from "./router/hooks/useRouterContext";
import { NotFoundPage } from "./pages/NotFoundPage";
import { HomePage } from "./pages/HomePage";
import { ProductDetailPage } from "./pages/ProductDetailPage";

const getTitle = async (router: RouterType) => {
  return (router.target as { getTitle?: (params?: StringRecord) => Promise<string> })?.getTitle?.(
    router.route?.params ?? {},
  );
};

async function prefetchData(route: RouterType["route"], params: StringRecord, query: StringRecord) {
  if (route?.path === "/product/:id/") {
    const currentProduct = await getProduct(params.id);

    productStore.dispatch({ type: PRODUCT_ACTIONS.SET_CURRENT_PRODUCT, payload: currentProduct });

    const { products } = await getProducts({
      category2: currentProduct.category2,
    });

    const relatedProducts = products.filter((product) => product.productId !== currentProduct.productId);

    productStore.dispatch({ type: PRODUCT_ACTIONS.SET_RELATED_PRODUCTS, payload: relatedProducts });

    productStore.dispatch({ type: PRODUCT_ACTIONS.SET_STATUS, payload: "done" });

    productStore.dispatch({ type: PRODUCT_ACTIONS.SET_LOADING, payload: false });

    return {
      currentProduct,
      relatedProducts,
    };
  }

  if (route?.path === "/") {
    const { products, pagination } = await getProducts(query);
    const { total } = pagination;
    const categories = await getCategories();

    const data = {
      products,
      categories,
      totalCount: total,
      status: "done",
    };

    productStore.dispatch({ type: PRODUCT_ACTIONS.SETUP, payload: data });

    return data;
  }
}
export const render = async (url: string, query: Record<string, string>) => {
  const router = createRouter({
    "/": HomePage,
    "/product/:id/": ProductDetailPage,
    ".*": NotFoundPage,
  });
  router.start(url);
  router.query = query;

  const initialData = await prefetchData(router.route, router.params, query);

  return {
    html: renderToString(
      <RouterContext value={router}>
        <App />
      </RouterContext>,
    ),
    head: `<title>${await getTitle(router)}</title>`,
    initialData,
  };
};

export { getProducts };
