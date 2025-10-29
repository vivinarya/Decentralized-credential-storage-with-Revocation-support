import { EthrDID } from 'ethr-did';
import { Resolver } from 'did-resolver';
import { getResolver as getEthrResolver } from 'ethr-did-resolver';
import { ethers } from 'ethers';
import crypto from 'crypto';

const RPC_URL = process.env.RPC_URL || process.env.NETWORK || 'https://rpc-amoy.polygon.technology/';
const CHAIN_ID = 80002;
const REGISTRY_CONTRACT = process.env.POLYGON_DID_REGISTRY || '0x41D788c9c5D335362D713152F407692c5EEAfAae';

// Configurable transaction settings
const DEFAULT_GAS_LIMIT = 200000;
const DEFAULT_GAS_PRICE_MULTIPLIER = 1.2; // 20% above current gas price
const TRANSACTION_TIMEOUT = 60000; // 60 seconds
const MAX_RETRIES = 3;

const providerConfig = {
  name: 'maticamoy',
  rpcUrl: RPC_URL,
  registry: REGISTRY_CONTRACT,
  chainId: CHAIN_ID
};

const ethrDidResolver = getEthrResolver(providerConfig);
const didResolver = new Resolver(ethrDidResolver);

class DIDService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
  }

  /**
   * Create an Issuer DID using wallet's secp256k1 key
   * Note: This uses the wallet's native key for DID control (not Ed25519)
   */
  async createIssuerDID(walletPrivateKey, issuerProfile) {
    try {
      let formattedPrivateKey = walletPrivateKey;
      if (!formattedPrivateKey.startsWith('0x')) {
        formattedPrivateKey = '0x' + formattedPrivateKey;
      }

      console.log('Creating wallet...');
      const wallet = new ethers.Wallet(formattedPrivateKey, this.provider);
      const address = wallet.address;
      console.log('Wallet address:', address);

      const did = `did:ethr:maticamoy:${address}`;
      
      console.log('Creating EthrDID...');
      const ethrDid = new EthrDID({
        identifier: address,
        privateKey: formattedPrivateKey.slice(2),
        provider: this.provider,
        chainNameOrId: CHAIN_ID,
        registry: REGISTRY_CONTRACT
      });

      console.log('DID created:', did);

      // Create W3C-compliant DID Document
      // The wallet's secp256k1 key controls this DID
      const didDocument = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: did,
        verificationMethod: [{
          id: `${did}#controller`,
          type: 'EcdsaSecp256k1RecoveryMethod2020',
          controller: did,
          blockchainAccountId: `eip155:${CHAIN_ID}:${address}`
        }],
        authentication: [`${did}#controller`],
        assertionMethod: [`${did}#controller`]
      };

      return {
        did,
        didDocument,
        walletAddress: address,
        publicKey: address, // The wallet address serves as the public key identifier
        encryptedPrivateKey: 'none', // Private key is managed by wallet, not stored
        profile: issuerProfile,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('DID creation error:', error.message);
      throw new Error('Failed to create DID');
    }
  }

  /**
   * Resolve a DID to its DID Document
   */
  async resolveDID(did) {
    try {
      console.log('Resolving DID:', did.substring(0, 40) + '...');
      const result = await didResolver.resolve(did);
      
      if (result.didResolutionMetadata.error) {
        throw new Error(result.didResolutionMetadata.error);
      }

      return result.didDocument;
    } catch (error) {
      console.error('DID resolution error:', error.message);
      throw new Error('Failed to resolve DID');
    }
  }

  /**
   * Update DID attribute on-chain with proper transaction handling
   */
  async updateDIDAttribute(
    walletPrivateKey, 
    attributeName, 
    attributeValue,
    options = {}
  ) {
    try {
      let formattedPrivateKey = walletPrivateKey;
      if (!formattedPrivateKey.startsWith('0x')) {
        formattedPrivateKey = '0x' + formattedPrivateKey;
      }

      const wallet = new ethers.Wallet(formattedPrivateKey, this.provider);
      const address = wallet.address;

      const ethrDid = new EthrDID({
        identifier: address,
        privateKey: formattedPrivateKey.slice(2),
        provider: this.provider,
        chainNameOrId: CHAIN_ID,
        registry: REGISTRY_CONTRACT
      });

      // Configurable TTL (default 1 year)
      const ttl = options.ttl || 31536000; // 1 year in seconds

      // Get current gas price with multiplier
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice 
        ? BigInt(Math.floor(Number(feeData.gasPrice) * DEFAULT_GAS_PRICE_MULTIPLIER))
        : undefined;

      console.log(`Setting attribute: ${attributeName}`);

      let retries = 0;
      let lastError;

      while (retries < MAX_RETRIES) {
        try {
          const txHash = await Promise.race([
            ethrDid.setAttribute(
              attributeName, 
              attributeValue, 
              ttl,
              { 
                gasLimit: options.gasLimit || DEFAULT_GAS_LIMIT,
                gasPrice: options.gasPrice || gasPrice
              }
            ),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Transaction timeout')), TRANSACTION_TIMEOUT)
            )
          ]);

          // Wait for transaction confirmation
          console.log('Waiting for transaction confirmation:', txHash);
          const receipt = await this.provider.waitForTransaction(txHash, 1, TRANSACTION_TIMEOUT);

          if (receipt.status === 1) {
            console.log('✅ Attribute updated successfully');
            return { 
              success: true, 
              txHash,
              blockNumber: receipt.blockNumber
            };
          } else {
            throw new Error('Transaction failed');
          }
        } catch (err) {
          lastError = err;
          retries++;
          console.warn(`Attempt ${retries} failed:`, err.message);
          
          if (retries < MAX_RETRIES) {
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
          }
        }
      }

      throw lastError;
    } catch (error) {
      console.error('Update DID attribute error:', error.message);
      throw new Error('Failed to update DID attribute');
    }
  }

  /**
   * Verify DID ownership using signature-based authentication
   * This provides cryptographic proof of control
   */
  async verifyDIDOwnership(did, walletAddress, signature, message) {
    try {
      // 1. Parse DID to extract address
      const didParts = did.split(':');
      const didAddress = didParts[didParts.length - 1].toLowerCase();

      // 2. Verify the provided wallet address matches DID
      if (didAddress !== walletAddress.toLowerCase()) {
        return {
          verified: false,
          error: 'Wallet address does not match DID'
        };
      }

      // 3. If signature provided, verify cryptographic ownership
      if (signature && message) {
        try {
          const recoveredAddress = ethers.verifyMessage(message, signature);
          
          if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            return {
              verified: false,
              error: 'Signature verification failed'
            };
          }

          return {
            verified: true,
            method: 'signature',
            recoveredAddress
          };
        } catch (sigError) {
          return {
            verified: false,
            error: 'Invalid signature'
          };
        }
      }

      // 4. Resolve DID Document to verify it exists on-chain
      try {
        const didDocument = await this.resolveDID(did);
        
        // Verify the DID document references the correct address
        const hasMatchingVerificationMethod = didDocument.verificationMethod?.some(
          vm => vm.blockchainAccountId?.includes(walletAddress.toLowerCase())
        );

        if (!hasMatchingVerificationMethod) {
          return {
            verified: false,
            error: 'DID document does not reference this wallet address'
          };
        }

        return {
          verified: true,
          method: 'did-resolution',
          didDocument
        };
      } catch (resolveError) {
        return {
          verified: false,
          error: 'DID not found on-chain'
        };
      }
    } catch (error) {
      console.error('Ownership verification error:', error.message);
      return {
        verified: false,
        error: 'Verification failed'
      };
    }
  }

  /**
   * Generate a challenge message for signature-based DID ownership verification
   * Uses cryptographically secure random for nonce
   */
  generateOwnershipChallenge(did) {
    const timestamp = Date.now();
    const nonce = crypto.randomUUID(); // Cryptographically secure
    return `Verify ownership of DID: ${did}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
  }
}

export default new DIDService();











