// credai-backend/services/vcService.js
import { ethers } from 'ethers';
import crypto from 'crypto';
import didService from './didService.js';

class VCService {
  /**
   * Create a W3C Verifiable Credential for a document
   */
  async createVerifiableCredential(document, issuer) {
    try {
      const credentialId = `urn:uuid:${crypto.randomUUID()}`;
      const issuanceDate = new Date().toISOString();
      

      const credential = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://www.w3.org/2018/credentials/examples/v1'
        ],
        id: credentialId,
        type: ['VerifiableCredential', 'DocumentVerificationCredential'],
        issuer: issuer.did,
        issuanceDate: issuanceDate,
        credentialSubject: {
          id: `did:web:credai#document:${document.fileHash}`,
          documentHash: document.fileHash,
          ipfsCid: document.ipfsCid,
          documentType: document.docType || 'general',
          uploadedBy: document.uploader,
          expirationDate: document.expirationDate || null
        },
        credentialStatus: {
          id: `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/credential-status/${credentialId}`,
          type: 'StatusList2021Entry'
        }
      };


      const proof = await this.createProof(credential, issuer);
      credential.proof = proof;

      return credential;
    } catch (error) {
      console.error('VC creation error:', error);
      throw new Error(`Failed to create VC: ${error.message}`);
    }
  }

  /**
   * Create cryptographic proof for VC - Simplified version
   */
  async createProof(credential, issuer) {
    try {
      // Use the original wallet private key from environment (for issuing)
      // In production, you'd retrieve this from a secure vault
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('PRIVATE_KEY not found in environment');
      }

      // Ensure proper format
      const formattedPrivateKey = privateKey.startsWith('0x') 
        ? privateKey 
        : '0x' + privateKey;

      // Create signature over the credential
      const credentialString = JSON.stringify({
        '@context': credential['@context'],
        type: credential.type,
        issuer: credential.issuer,
        issuanceDate: credential.issuanceDate,
        credentialSubject: credential.credentialSubject
      });

      // Sign with wallet
      const wallet = new ethers.Wallet(formattedPrivateKey);
      const signature = await wallet.signMessage(credentialString);

      // Create proof object
      const proof = {
        type: 'EcdsaSecp256k1Signature2019',
        created: new Date().toISOString(),
        verificationMethod: `${issuer.did}#controller`,
        signatureValue: signature,
        challenge: crypto.randomBytes(32).toString('hex'),
        domain: process.env.API_BASE_URL || 'http://localhost:5000'
      };

      return proof;
    } catch (error) {
      console.error('Proof creation error:', error);
      throw new Error(`Failed to create proof: ${error.message}`);
    }
  }

  /**
   * Verify a Verifiable Credential
   */
  async verifyCredential(credential, issuer) {
    try {
      if (!credential.proof) {
        throw new Error('Credential has no proof');
      }

      // Reconstruct the signed data
      const credentialString = JSON.stringify({
        '@context': credential['@context'],
        type: credential.type,
        issuer: credential.issuer,
        issuanceDate: credential.issuanceDate,
        credentialSubject: credential.credentialSubject
      });

      // Verify signature
      const recoveredAddress = ethers.verifyMessage(
        credentialString,
        credential.proof.signatureValue
      );

      const issuerAddress = issuer.walletAddress.toLowerCase();
      const isValid = recoveredAddress.toLowerCase() === issuerAddress;

      return {
        valid: isValid,
        issuer: recoveredAddress,
        expectedIssuer: issuerAddress,
        timestamp: credential.proof.created,
        verificationMethod: credential.proof.verificationMethod
      };
    } catch (error) {
      console.error('Verification error:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get credential status (revocation check)
   */
  async getCredentialStatus(credentialId, document) {
    return {
      id: credentialId,
      credentialId: credentialId,
      revoked: document.revoked || false,
      revokedAt: document.revokedAt || null,
      reason: document.revocationReason || null
    };
  }

  /**
   * Revoke a credential
   */
  async revokeCredential(credentialId, document, reason) {
    try {
      document.revoked = true;
      document.revokedAt = new Date();
      document.revocationReason = reason;
      await document.save();

      return {
        success: true,
        credentialId: credentialId,
        revokedAt: document.revokedAt
      };
    } catch (error) {
      console.error('Revocation error:', error);
      throw new Error(`Failed to revoke credential: ${error.message}`);
    }
  }
}

export default new VCService();

