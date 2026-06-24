/**
 * Local dev pointing at the production Vercel backend.
 * Used with: npm run start:vercel
 */
export const environment = {
  production: false,
  apiUrl: 'https://my-gym-desk.vercel.app',
  devBypassAuth: true,
  /** Fill in locally — real MongoDB userId + matching DEV_BYPASS_TOKEN */
  devUserId: '',
  devBypassToken: '',
};
