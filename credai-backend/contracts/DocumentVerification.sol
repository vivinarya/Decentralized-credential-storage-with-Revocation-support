// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DocumentVerification {
    struct Document {
        bytes32 fileHash;
        address uploader;
        uint256 expiration;
        bool revoked;
    }

    mapping(bytes32 => Document) private documents;

    event DocumentRegistered(bytes32 indexed fileHash, uint256 expiration);
    event DocumentRevoked(bytes32 indexed fileHash);

    function registerDocument(bytes32 fileHash, uint256 expiration) external {
        require(documents[fileHash].fileHash == 0, "Document already exists");
        documents[fileHash] = Document(fileHash, msg.sender, expiration, false);
        emit DocumentRegistered(fileHash, expiration);
    }

    function revokeDocument(bytes32 fileHash) external {
        require(documents[fileHash].fileHash != 0, "Document does not exist");
        require(documents[fileHash].uploader == msg.sender, "Only uploader can revoke");
        require(!documents[fileHash].revoked, "Already revoked");
        
        documents[fileHash].revoked = true;
        emit DocumentRevoked(fileHash);
    }

    function isExpired(bytes32 fileHash) public view returns (bool) {
        Document memory doc = documents[fileHash];
        if (doc.expiration == 0) return false;
        return block.timestamp > doc.expiration;
    }

    function verifyDocument(bytes32 fileHash) public view returns (
        bool exists,
        address uploader,
        uint256 expiration,
        bool expired,
        bool revoked
    ) {
        Document memory doc = documents[fileHash];
        exists = doc.fileHash != 0;
        uploader = doc.uploader;
        expiration = doc.expiration;
        expired = isExpired(fileHash);
        revoked = doc.revoked;
    }

    function getDocument(bytes32 fileHash) public view returns (Document memory) {
        return documents[fileHash];
    }
}
