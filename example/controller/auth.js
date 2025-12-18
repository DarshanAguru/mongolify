import { Router } from 'express';
import { buildAjvValidator, emitJsonSchema } from '../../dist/esm/index.js';
import { userSchema } from '../models/user.js';

const router = Router();

// Validators
const validateLoginDTO = buildAjvValidator(
  userSchema,
  {
    include: ['username'],
    append: {
      password: {
        type: 'string',
        required: true,
        minLength: 8,
        maxLength: 128,
      },
    },
  },
  { coerceTypes: false, allowUnknown: false }
);

const validateRegisterDTO = buildAjvValidator(
  userSchema,
  {
    include: ['username', 'email', 'age', 'gender', 'phone', 'city'],
    optional: ['email'], // demonstrate overriding schema-required as optional for this endpoint
    append: {
      password: {
        type: 'string',
        required: true,
        minLength: 8,
        maxLength: 128,
      },
    },
  },
  { coerceTypes: true, allowUnknown: false }
);

const validateUpdateProfileDTO = buildAjvValidator(
  userSchema,
  {
    include: [
      'email',
      'phone',
      'city',
      'address.street',
      'address.pinCode',
      'tags',
    ],
    optional: [
      'email',
      'phone',
      'city',
      'address.street',
      'address.pinCode',
      'tags',
    ],
  },
  { coerceTypes: true, allowUnknown: false }
);

// Routes
router.post('/login', (req, res) => {
  const { ok, data, errors } = validateLoginDTO(req.body);
  if (!ok) return res.status(400).json({ success: false, errors });
  // No real auth logic; just echo validated payload
  res.json({ success: true, message: 'Login payload validated', data });
});

router.post('/register', (req, res) => {
  const { ok, data, errors } = validateRegisterDTO(req.body);
  if (!ok) return res.status(400).json({ success: false, errors });
  res
    .status(201)
    .json({ success: true, message: 'Register payload validated', data });
});

router.patch('/profile', (req, res) => {
  const { ok, data, errors } = validateUpdateProfileDTO(req.body);
  if (!ok) return res.status(400).json({ success: false, errors });
  res.json({ success: true, message: 'Profile payload validated', data });
});

// JSON Schema (OpenAPI-ready) for the register DTO
router.get('/schema/register', (_req, res) => {
  const jsonSchema = emitJsonSchema(userSchema, {
    include: ['username', 'email', 'age', 'gender', 'phone', 'city'],
    optional: ['email'],
    append: { password: { type: 'string', required: true, minLength: 8 } },
  });
  res.json({ success: true, schema: jsonSchema });
});

export default router;
