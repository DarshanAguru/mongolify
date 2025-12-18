import { Router } from 'express';
import {
  buildFilter,
  buildProjection,
  parseSort,
  parsePagination,
} from '../../dist/esm/index.js';

import {
  applyFilterToArray,
  applyProjectionToArray,
  applySortToArray
} from '../../dist/esm/arrayHelpers/index.js';

const router = Router();

// Mock dataset (no DB)
const USERS = [
  {
    id: '1',
    username: 'alice',
    email: 'alice@example.com',
    city: 'Hyderabad',
    age: 25,
    gender: 'female',
    phone: '9199998888',
    tags: ['dev', 'js'],
  },
  {
    id: '2',
    username: 'bob',
    email: 'bob@example.com',
    city: 'Bangalore',
    age: 32,
    gender: 'male',
    phone: '9199997777',
    tags: ['ops'],
  },
  {
    id: '3',
    username: 'carol',
    email: 'carol@example.com',
    city: 'Hyderabad',
    age: 19,
    gender: 'female',
    phone: '9199996666',
    tags: ['js'],
  },
];


router.get('/users', (req, res) => {
  const filter = buildFilter({
    equals: req.query.gender ? { gender: req.query.gender } : undefined,
    in: req.query.cities
      ? { city: String(req.query.cities).split(',') }
      : undefined,
    range:
      req.query.ageMin || req.query.ageMax
        ? {
            age: {
              gte: Number(req.query.ageMin),
              lte: Number(req.query.ageMax),
            },
          }
        : undefined,
    search: req.query.q
      ? { q: String(req.query.q), fields: ['username', 'email', 'city'] }
      : undefined,
    exists: req.query.hasPhone === 'true' ? ['phone'] : [],
    notExists: req.query.hasEmail === 'false' ? ['email'] : [],
  });

  const projection = buildProjection({
    include: (req.query.include || '').split(',').filter(Boolean),
    exclude: (req.query.exclude || '').split(',').filter(Boolean),
  });

  const sort = parseSort(req.query.sort); // e.g. "age:desc,username:asc"
  const { page, pageSize, skip, limit } = parsePagination({
    page: req.query.page,
    pageSize: req.query.pageSize,
  });

  // Apply filter to mock data
  let items = applyFilterToArray(USERS, filter);

  // Apply sort
  items = applySortToArray(items, sort);

  // Pagination
  const total = items.length;
  items = items.slice(skip, skip + limit);

  // Projection
  items = applyProjectionToArray(items, projection);

  res.json({
    success: true,
    filter,
    projection,
    sort,
    page,
    pageSize,
    total,
    items,
  });
});

export default router;
