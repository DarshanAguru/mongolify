import { Router } from 'express';
import { PolicyPipeline } from '../../dist/esm/index.js';

const router = Router();

const userPolicy = new PolicyPipeline({
  beforeCreate: async ({ actor, data }) => {
    if (!actor) throw new Error('UNAUTHENTICATED');
    if (actor.role !== 'ADMIN') throw new Error('FORBIDDEN_CREATE_USER');
    // audit
    data.createdBy = actor.id;
    data.updatedBy = actor.id;
  },
  afterCreate: async ({ actor }, createdDoc) => {
    console.log(
      'User created by',
      actor?.id,
      '->',
      createdDoc?.id ?? 'mock-id'
    );
  },
  beforeUpdate: async ({ actor, id, update }) => {
    if (!actor) throw new Error('UNAUTHENTICATED');
    update.updatedBy = actor.id;
  },
  afterUpdate: async ({ actor, id }, updatedDoc) => {
    console.log(
      'User updated by',
      actor?.id,
      '->',
      id,
      'doc:',
      updatedDoc?.id ?? 'mock-id'
    );
  },
  beforeDelete: async ({ actor }) => {
    if (actor?.role !== 'ADMIN') throw new Error('FORBIDDEN_DELETE_USER');
  },
  afterDelete: async ({ id }) => {
    console.log('User deleted:', id);
  },
});

// Simulated actor middleware (for demo)
const getActor = (req) => {
  // Pass ?as=admin to simulate admin; default is unauthenticated
  const as = String(req.query.as || '');
  if (as === 'admin') return { id: 'admin-1', role: 'ADMIN' };
  if (as === 'user') return { id: 'user-1', role: 'CONSUMER' };
  return null;
};

router.post('/create', async (req, res) => {
  try {
    const actor = getActor(req);
    await userPolicy.runBeforeCreate({ actor, data: req.body });
    const createdDoc = { id: 'mock-created-id', ...req.body }; // simulate persistence
    await userPolicy.runAfterCreate({ actor, data: req.body }, createdDoc);
    res.status(201).json({ success: true, created: createdDoc });
  } catch (err) {
    res
      .status(403)
      .json({ success: false, error: String(err?.message || err) });
  }
});

router.patch('/update/:id', async (req, res) => {
  try {
    const actor = getActor(req);
    await userPolicy.runBeforeUpdate({
      actor,
      id: req.params.id,
      update: req.body,
    });
    const updatedDoc = { id: req.params.id, ...req.body };
    await userPolicy.runAfterUpdate(
      { actor, id: req.params.id, update: req.body },
      updatedDoc
    );
    res.json({ success: true, updated: updatedDoc });
  } catch (err) {
    res
      .status(403)
      .json({ success: false, error: String(err?.message || err) });
  }
});

router.delete('/delete/:id', async (req, res) => {
  try {
    const actor = getActor(req);
    await userPolicy.runBeforeDelete({ actor, id: req.params.id });
    // simulate delete
    await userPolicy.runAfterDelete({ actor, id: req.params.id });
    res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    res
      .status(403)
      .json({ success: false, error: String(err?.message || err) });
  }
});

export default router;
