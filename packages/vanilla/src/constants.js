// [수정 전]
// export const BASE_URL = import.meta.env.PROD ? "/front_7th_chapter4-1/vanilla/" : "/";
export const BASE_URL = (import.meta.env && import.meta.env.PROD) 
  ? "/front_7th_chapter4-1/vanilla/" 
  : "/";