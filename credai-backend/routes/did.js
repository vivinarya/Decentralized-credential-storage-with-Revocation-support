import express from 'express';
import Issuer from '../models/Issuer.js';
import Document from '../models/Document.js';

const router = express.Router();

/**
 * POST /api/did/register
 * Create a new issuer profile (allows multiple per wallet)
 */
router.post('/register', async (req, res) => {
  try {
    const { did, name, organization, address } = req.body;

    if (!did || !name || !organization || !address) {
      return res.status(400).json({ 
        error: 'Missing required fields: did, name, organization, address' 
      });
    }

    // Validate DID format
    if (!did.startsWith('did:ethr:maticamoy:')) {
      return res.status(400).json({ 
        error: 'Invalid DID format. Expected: did:ethr:maticamoy:0x...' 
      });
    }

    console.log('📝 Registering new issuer profile:', { 
      name, 
      organization,
      wallet: address.slice(0, 10) + '...'
    });

    // Check if this wallet already has a profile for this organization
    const existingProfile = await Issuer.findOne({ 
      walletAddress: address.toLowerCase(),
      'profile.organization': organization
    });

    if (existingProfile) {
      console.log('⚠️  Profile already exists for this organization');
      return res.status(409).json({ 
        error: `You already have an issuer profile for "${organization}"`,
        issuer: {
          did: existingProfile.did,
          name: existingProfile.profile.name,
          organization: existingProfile.profile.organization,
        }
      });
    }

    // Generate unique DID with timestamp
    const timestamp = Date.now();
    const uniqueDID = `did:ethr:maticamoy:${address.toLowerCase()}:${timestamp}`;

    // Create DID Document
    const didDocument = {
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: uniqueDID,
      verificationMethod: [{
        id: `${uniqueDID}#controller`,
        type: 'EcdsaSecp256k1RecoveryMethod2020',
        controller: uniqueDID,
        blockchainAccountId: `eip155:80002:${address}`
      }],
      authentication: [`${uniqueDID}#controller`],
      assertionMethod: [`${uniqueDID}#controller`]
    };

    // Create new issuer profile
    const issuer = new Issuer({
      did: uniqueDID,
      didDocument,
      walletAddress: address.toLowerCase(),
      profile: {
        name,
        organization,
        verified: false
      },
      publicKey: address,
      encryptedPrivateKey: 'none',
      documentsIssued: 0,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      status: 'active'
    });

    await issuer.save();

    console.log('✅ New issuer profile created');

    res.json({
      success: true,
      message: "Issuer profile created successfully",
      issuer: {
        did: issuer.did,
        name: issuer.profile.name,
        organization: issuer.profile.organization,
        walletAddress: issuer.walletAddress,
        documentsIssued: issuer.documentsIssued,
      },
    });

  } catch (error) {
    console.error("❌ DID registration error:", error);
    
    // Handle duplicate organization error
    if (error.code === 11000) {
      return res.status(409).json({ 
        error: "You already have an issuer profile for this organization" 
      });
    }
    
    res.status(500).json({ error: "Failed to register issuer", details: error.message });
  }
});

/**
 * GET /api/did/wallet/:address/profiles
 * Get all issuer profiles for a wallet address
 */
router.get('/wallet/:address/profiles', async (req, res) => {
  try {
    const { address } = req.params;

    console.log('🔍 Fetching profiles for wallet:', address.slice(0, 10) + '...');

    const profiles = await Issuer.find({ 
      walletAddress: address.toLowerCase() 
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${profiles.length} profile(s)`);

    res.json({
      success: true,
      count: profiles.length,
      profiles: profiles.map(p => ({
        did: p.did,
        name: p.profile.name,
        organization: p.profile.organization,
        verified: p.profile.verified,
        documentsIssued: p.documentsIssued,
        createdAt: p.createdAt,
        lastActivityAt: p.lastActivityAt,
        status: p.status
      }))
    });

  } catch (error) {
    console.error('❌ Fetch profiles error:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

/**
 * PUT /api/did/:did/profile
 * Update issuer profile information
 */
router.put('/:did/profile', async (req, res) => {
  try {
    const { did } = req.params;
    const { name, organization, email } = req.body;

    if (!name && !organization && !email) {
      return res.status(400).json({ 
        error: 'At least one field (name, organization, email) must be provided' 
      });
    }

    console.log('✏️  Updating profile for DID:', did.slice(0, 30) + '...');

    const issuer = await Issuer.findOne({ 
      did: { $regex: new RegExp(`^${did}$`, 'i') }
    });

    if (!issuer) {
      return res.status(404).json({ error: 'Issuer not found' });
    }

    // Update fields
    if (name) issuer.profile.name = name;
    
    if (organization) {
      // Check if another profile from this wallet already has this org
      const duplicate = await Issuer.findOne({
        walletAddress: issuer.walletAddress,
        'profile.organization': { $regex: new RegExp(`^${organization}$`, 'i') },
        _id: { $ne: issuer._id }
      });
      
      if (duplicate) {
        return res.status(409).json({ 
          error: `You already have a profile for organization "${organization}"` 
        });
      }
      
      issuer.profile.organization = organization;
    }
    
    if (email) issuer.profile.email = email;
    
    issuer.lastActivityAt = new Date();

    await issuer.save();

    console.log('✅ Profile updated');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      issuer: {
        did: issuer.did,
        name: issuer.profile.name,
        organization: issuer.profile.organization,
        email: issuer.profile.email,
      }
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * DELETE /api/did/:did
 * Delete an issuer profile
 */
router.delete('/:did', async (req, res) => {
  try {
    const { did } = req.params;

    console.log('🗑️  Deleting profile:', did.slice(0, 30) + '...');

    // Check if issuer has documents
    const docCount = await Document.countDocuments({ issuerDID: did });
    
    if (docCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete profile with ${docCount} issued document(s)`,
        documentsIssued: docCount
      });
    }

    const result = await Issuer.deleteOne({ 
      did: { $regex: new RegExp(`^${did}$`, 'i') } 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Issuer not found' });
    }

    console.log('✅ Profile deleted');

    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete profile error:', error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

/**
 * GET /api/did/:did
 * Get issuer information by DID
 */
router.get('/:did', async (req, res) => {
  try {
    const { did } = req.params;

    const issuer = await Issuer.findOne({ 
      did: { $regex: new RegExp(`^${did}$`, 'i') } 
    });

    if (!issuer) {
      return res.status(404).json({ error: 'Issuer not found' });
    }

    res.json({
      success: true,
      issuer: {
        did: issuer.did,
        name: issuer.profile.name,
        organization: issuer.profile.organization,
        email: issuer.profile.email,
        verified: issuer.profile.verified,
        walletAddress: issuer.walletAddress,
        documentsIssued: issuer.documentsIssued,
        createdAt: issuer.createdAt,
        lastActivityAt: issuer.lastActivityAt,
        status: issuer.status
      },
    });
  } catch (error) {
    console.error('DID lookup error:', error);
    res.status(500).json({ error: 'Failed to fetch issuer' });
  }
});

/**
 * GET /api/did/issuer/:address/stats
 * Get aggregated statistics for all profiles of a wallet
 */
router.get('/issuer/:address/stats', async (req, res) => {
  try {
    const { address } = req.params;

    const profiles = await Issuer.find({ 
      walletAddress: address.toLowerCase() 
    });

    if (profiles.length === 0) {
      return res.status(404).json({ error: 'No issuer profiles found' });
    }

    // Aggregate stats across all profiles
    let totalDocs = 0;
    let activeDocs = 0;

    for (const profile of profiles) {
      const docs = await Document.countDocuments({ issuerDID: profile.did });
      const active = await Document.countDocuments({ 
        issuerDID: profile.did, 
        revoked: false 
      });
      totalDocs += docs;
      activeDocs += active;
    }

    res.json({
      success: true,
      stats: {
        profileCount: profiles.length,
        totalDocuments: totalDocs,
        activeDocuments: activeDocs,
        revokedDocuments: totalDocs - activeDocs,
        profiles: profiles.map(p => ({
          organization: p.profile.organization,
          documentsIssued: p.documentsIssued,
          verified: p.profile.verified
        }))
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;








