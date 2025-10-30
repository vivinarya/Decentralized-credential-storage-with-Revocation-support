import express from 'express';
import Issuer from '../models/Issuer.js';
import rateLimit from 'express-rate-limit';
import _ from 'lodash';

// Rate limiter: restrict approval attempts to 10 per 15 minutes per IP
const approveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: 'Too many approval attempts from this IP, please try again later.' }
});

// Rate limiter: restrict pending issuer listing requests to 50 per 15 minutes per IP
const pendingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { error: 'Too many requests to pending issuers list from this IP, please try again later.' }
});

// Rate limiter: restrict issuer rejection attempts to 10 per 15 minutes per IP
const rejectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { error: 'Too many issuer rejection attempts from this IP, please try again later.' }
});

const router = express.Router();

/**
 * GET /api/admin/issuers/pending
 * Get all pending issuer approvals
 */
router.get('/issuers/pending', pendingLimiter, async (req, res) => {
  try {
    const pendingIssuers = await Issuer.find({ 
      status: 'pending' 
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pendingIssuers.length,
      issuers: pendingIssuers.map(i => ({
        did: i.did,
        name: i.profile.name,
        organization: i.profile.organization,
        walletAddress: i.walletAddress,
        documentsIssued: i.documentsIssued,
        createdAt: i.createdAt,
        status: i.status
      }))
    });
  } catch (error) {
    console.error('Error fetching pending issuers:', error);
    res.status(500).json({ error: 'Failed to fetch pending issuers' });
  }
});

/**
 * POST /api/admin/issuers/:did/approve
 * Approve an issuer
 */
router.post('/issuers/:did/approve', approveLimiter, async (req, res) => {
  try {
    const { did } = req.params;
    const safeDid = _.escapeRegExp(did);
    const issuer = await Issuer.findOne({ 
      did: { $regex: new RegExp(`^${safeDid}$`, 'i') } 
    });

    if (!issuer) {
      return res.status(404).json({ error: 'Issuer not found' });
    }

    issuer.status = 'active';
    issuer.profile.verified = true;
    issuer.lastActivityAt = new Date();

    await issuer.save();

    console.log('✅ Issuer approved:', issuer.profile.name);

    res.json({
      success: true,
      message: 'Issuer approved successfully',
      issuer: {
        did: issuer.did,
        name: issuer.profile.name,
        organization: issuer.profile.organization,
        verified: issuer.profile.verified,
        status: issuer.status
      }
    });
  } catch (error) {
    console.error('Error approving issuer:', error);
    res.status(500).json({ error: 'Failed to approve issuer' });
  }
});

/**
 * POST /api/admin/issuers/:did/reject
 * Reject an issuer
 */
router.post('/issuers/:did/reject', rejectLimiter, async (req, res) => {
  try {
    const { did } = req.params;
    const { reason } = req.body;
    const safeDid = _.escapeRegExp(did);
    const issuer = await Issuer.findOne({ 
      did: { $regex: new RegExp(`^${safeDid}$`, 'i') } 
    });

    if (!issuer) {
      return res.status(404).json({ error: 'Issuer not found' });
    }

    issuer.status = 'suspended';
    issuer.lastActivityAt = new Date();

    await issuer.save();

    console.log('❌ Issuer rejected:', issuer.profile.name, 'Reason:', reason);

    res.json({
      success: true,
      message: 'Issuer rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting issuer:', error);
    res.status(500).json({ error: 'Failed to reject issuer' });
  }
});

export default router;
