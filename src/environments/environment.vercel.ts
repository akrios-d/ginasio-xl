/**
 * Ambiente local apontando para a API do Vercel em produção.
 * Usado com: npm run start:vercel
 *
 * Útil para testar o frontend local contra dados reais sem precisar de
 * correr o `vercel dev` localmente.
 *
 * Substitui VERCEL_URL pelo URL do teu deploy, ex:
 *   https://ginasio-xl.vercel.app
 */
export const environment = {
  production: false,
  apiUrl: 'https://ginasio-xl.vercel.app',
};
