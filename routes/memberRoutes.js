const express = require('express');
const router = express.Router();
const {
    getAllMembers,
    getMemberById,
    createMember,
    updateMember,
    deleteMember
} = require('../controllers/memberController');
const { validateMember, validateObjectId } = require('../middleware/validation');

// GET all members
router.get('/', getAllMembers);

// GET single member by ID
router.get('/:id', validateObjectId, getMemberById);

// POST create new member
router.post('/', validateMember, createMember);

// PUT update member by ID
router.put('/:id', validateObjectId, validateMember, updateMember);

// DELETE member by ID
router.delete('/:id', validateObjectId, deleteMember);

module.exports = router;