
const express = require('express');
const router = express.Router();
const { fragments, users } = require('../data/store');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Public: Anyone (even unauthenticated) can read published fragments
router.get('/', (req, res) => {
  res.json(fragments);
});

// FIX F4: Only Contributors, Curators, and Admins can submit new fragments
router.post('/', auth, roleCheck(['contributor', 'curator', 'admin']), (req, res) => {
  const { content, parentId } = req.body;
  const newFrag = {
    id: Date.now().toString(),
    content,
    parentId,
    userId: req.user.userId,
    author: users.find(u => u.id === req.user.userId)?.email,
    status: 'pending', // Properly set to pending — requires curator approval
    createdAt: new Date()
  };
  fragments.push(newFrag);
  res.status(201).json(newFrag);
});

// FIX F4: Curators and Admins can edit any fragment; Contributors can only edit their own
router.put('/:id', auth, roleCheck(['contributor', 'curator', 'admin']), (req, res) => {
  const frag = fragments.find(f => f.id === req.params.id);
  if(!frag) return res.status(404).json({ error: 'Fragment not found' });

  // Ownership check: Contributors can only edit their own fragments
  if (req.user.role === 'contributor' && frag.userId !== req.user.userId) {
    return res.status(403).json({ error: 'Contributors can only edit their own fragments' });
  }

  frag.content = req.body.content;
  res.json(frag);
});

// FIX F4: Only Curators and Admins can approve fragments
router.post('/:id/approve', auth, roleCheck(['curator', 'admin']), (req, res) => {
  const frag = fragments.find(f => f.id === req.params.id);
  if(!frag) return res.status(404).json({ error: 'Fragment not found' });
  frag.status = 'published';
  res.json(frag);
});

// FIX F4: Only Admins can delete fragments
router.delete('/:id', auth, roleCheck(['admin']), (req, res) => {
  const index = fragments.findIndex(f => f.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  fragments.splice(index, 1);
  res.json({ message: 'Deleted' });
});

module.exports = router;
