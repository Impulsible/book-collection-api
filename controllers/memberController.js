const Member = require('../models/member');

// GET all members
const getAllMembers = async (req, res) => {
    try {
        const members = await Member.find().sort({ lastName: 1 });
        res.json({
            success: true,
            data: members,
            count: members.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving members',
            error: error.message
        });
    }
};

// GET single member by ID
const getMemberById = async (req, res) => {
    try {
        const member = await Member.findById(req.params.id);
        
        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        res.json({
            success: true,
            data: member
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving member',
            error: error.message
        });
    }
};

// POST create new member
const createMember = async (req, res) => {
    try {
        const member = new Member(req.body);
        const savedMember = await member.save();

        res.status(201).json({
            success: true,
            message: 'Member created successfully',
            data: savedMember
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }
        res.status(400).json({
            success: false,
            message: 'Error creating member',
            error: error.message
        });
    }
};

// PUT update member by ID
const updateMember = async (req, res) => {
    try {
        const member = await Member.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        res.json({
            success: true,
            message: 'Member updated successfully',
            data: member
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }
        res.status(400).json({
            success: false,
            message: 'Error updating member',
            error: error.message
        });
    }
};

// DELETE member by ID
const deleteMember = async (req, res) => {
    try {
        const member = await Member.findByIdAndDelete(req.params.id);

        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        res.json({
            success: true,
            message: 'Member deleted successfully',
            data: member
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting member',
            error: error.message
        });
    }
};

module.exports = {
    getAllMembers,
    getMemberById,
    createMember,
    updateMember,
    deleteMember
};