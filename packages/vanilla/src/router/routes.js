// src/routes.js
import { HomePage, ProductDetailPage, NotFoundPage } from "../pages/index.js";

export const registerRoutes = (routerInstance) => {
  if (!routerInstance) return;

  routerInstance.addRoute("/", HomePage);
  routerInstance.addRoute("/product/:id", ProductDetailPage);
  routerInstance.addRoute(".*", NotFoundPage);
};