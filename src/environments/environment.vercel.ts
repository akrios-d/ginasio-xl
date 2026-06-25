/**
 * Local dev pointing at the production Vercel backend.
 * Used with: npm run start:vercel
 */
export const environment = {
  production: false,
  apiUrl: 'https://my-gym-desk.vercel.app',
  devBypassAuth: true,
  /** Fill in locally — real MongoDB userId + matching DEV_BYPASS_TOKEN */
  devUserId: '6a3c78e8978fb7d6751873d6',
  devBypassToken: 'f2966d548971a49f6ceb3eafa273cdd3d5ffb161c8cc5401cc38db8d3edec75a',
};
