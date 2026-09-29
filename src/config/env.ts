import { config } from 'dotenv';

// Local development uses `.env`. Production receives values from Vercel.
if (process.env.NODE_ENV !== 'production') {
  config({ path: '.env', quiet: true });
}
