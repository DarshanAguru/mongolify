import { Router } from 'express';
import {
  compileRulesFromMongooseSchema,
  emitJsonSchema,
  buildAjvValidator,
} from '../../dist/esm/index.js';
import { userSchema } from '../models/user.js';

const router = Router();

router.get('/timings', (_req, res) => {
  const timings = [];

  // Rule tree
  const t1 = performance.now();
  compileRulesFromMongooseSchema(userSchema);
  const t2 = performance.now();
  compileRulesFromMongooseSchema(userSchema); // cached
  const t3 = performance.now();

  timings.push({ step: 'compileRules#first', ms: +(t2 - t1).toFixed(3) });
  timings.push({ step: 'compileRules#cached', ms: +(t3 - t2).toFixed(3) });

  // Overrides for JSON schema and validator
  const overrides = {
    include: ['username'],
    append: { password: { type: 'string', required: true, minLength: 8 } },
  };

  const t4 = performance.now();
  emitJsonSchema(userSchema, overrides);
  const t5 = performance.now();
  emitJsonSchema(userSchema, overrides); // cached by override key
  const t6 = performance.now();

  timings.push({ step: 'emitJsonSchema#first', ms: +(t5 - t4).toFixed(3) });
  timings.push({ step: 'emitJsonSchema#cached', ms: +(t6 - t5).toFixed(3) });

  const t7 = performance.now();
  const validate = buildAjvValidator(userSchema, overrides);
  const t8 = performance.now();
  const validateCached = buildAjvValidator(userSchema, overrides); // cached Ajv fn
  const t9 = performance.now();

  // execute validators to ensure they work
  const r1 = validate({ username: 'alice', password: 'supersecret' });
  const r2 = validateCached({ username: 'bob' }); // missing password to show errors

  timings.push({ step: 'buildAjvValidator#first', ms: +(t8 - t7).toFixed(3) });
  timings.push({ step: 'buildAjvValidator#cached', ms: +(t9 - t8).toFixed(3) });

  res.json({
    success: true,
    timings,
    validateResults: { first: r1, cached: r2 },
  });
});

export default router;
