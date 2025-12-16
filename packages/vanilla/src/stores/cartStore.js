import { createStore } from "../lib/index.js"; // .js 확인
import { CART_ACTIONS } from "./actionTypes.js";

/**
 * 장바구니 스토어 초기 상태
 */
const initialState = {
  items: [],
  selectedAll: false,
};

const findCartItem = (items, productId) => {
  return items.find((item) => item.id === productId);
};

/**
 * [수정 포인트] export를 꼭 붙여야 서버가 가져갈 수 있습니다!
 * 또한, state 기본값(= initialState)을 할당해야 합니다.
 */
export const cartReducer = (state = initialState, action) => {
  // [중요] 서버 호환성을 위해 스토리지 직접 접근 코드(cartStorage.get)는 제거하거나
  // 액션(LOAD_FROM_STORAGE)으로 처리해야 합니다.
  
  switch (action.type) {
    case CART_ACTIONS.ADD_ITEM: {
      const { product, quantity = 1 } = action.payload;
      const existingItem = findCartItem(state.items, product.productId);

      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === product.productId ? { ...item, quantity: item.quantity + quantity } : item,
          ),
        };
      } else {
        const newItem = {
          id: product.productId,
          title: product.title,
          image: product.image,
          price: parseInt(product.lprice),
          quantity,
          selected: false,
        };
        return {
          ...state,
          items: [...state.items, newItem],
        };
      }
    }

    case CART_ACTIONS.REMOVE_ITEM:
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };

    case CART_ACTIONS.UPDATE_QUANTITY: {
      const { productId, quantity } = action.payload;
      return {
        ...state,
        items: state.items.map((item) => (item.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item)),
      };
    }

    case CART_ACTIONS.CLEAR_CART:
      return {
        ...state,
        items: [],
        selectedAll: false,
      };

    case CART_ACTIONS.TOGGLE_SELECT: {
      const productId = action.payload;
      const updatedItems = state.items.map((item) =>
        item.id === productId ? { ...item, selected: !item.selected } : item,
      );
      const allSelected = updatedItems.length > 0 && updatedItems.every((item) => item.selected);

      return {
        ...state,
        items: updatedItems,
        selectedAll: allSelected,
      };
    }

    case CART_ACTIONS.SELECT_ALL: {
      const updatedItems = state.items.map((item) => ({
        ...item,
        selected: true,
      }));
      return {
        ...state,
        items: updatedItems,
        selectedAll: true,
      };
    }

    case CART_ACTIONS.DESELECT_ALL: {
      const updatedItems = state.items.map((item) => ({
        ...item,
        selected: false,
      }));
      return {
        ...state,
        items: updatedItems,
        selectedAll: false,
      };
    }

    case CART_ACTIONS.REMOVE_SELECTED:
      return {
        ...state,
        items: state.items.filter((item) => !item.selected),
        selectedAll: false,
      };

    case CART_ACTIONS.LOAD_FROM_STORAGE:
      return {
        ...state,
        ...action.payload,
      };

    default:
      return state;
  }
};

export const cartStore = createStore(cartReducer, initialState);