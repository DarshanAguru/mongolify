import express from 'express';
import authRouter from './controller/auth.js';
import policyRouter from './controller/policy.js';
import queryRouter from './controller/query.js';
import cacheRouter from './controller/cache.js';

const app = express();
app.use(express.json());

// Showcase all library features under /test
app.use('/test/auth', authRouter);
app.use('/test/policy', policyRouter);
app.use('/test/query', queryRouter);
app.use('/test/cache', cacheRouter);

app.get('/', (_req, res) => {
  res.send({
    message: 'mongolify demo server',
    routes: {
      auth: '/test/auth',
      policy: '/test/policy',
      query: '/test/query',
      cache: '/test/cache',
    },
  });
});

app.listen(3000, () => {
  console.log(`Server is running on http://localhost:3000`);
});
