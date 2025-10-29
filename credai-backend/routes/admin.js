import express from 'express';
import Issuer from '../models/Issuer.js';

const router = express.Router();

/**
 * GET /api/admin/issuers/pending
 * Get all pending issuer approvals
 */
router.get('/issuers/pending', async (req, res) => {
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
router.post('/issuers/:did/approve', async (req, res) => {
  try {
    const { did } = req.params;

    const issuer = await Issuer.findOne({ 
      did: { $regex: new RegExp(`^${did}$`, 'i') } 
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
router.post('/issuers/:did/reject', async (req, res) => {
  try {
    const { did } = req.params;
    const { reason } = req.body;

    const issuer = await Issuer.findOne({ 
      did: { $regex: new RegExp(`^${did}$`, 'i') } 
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
