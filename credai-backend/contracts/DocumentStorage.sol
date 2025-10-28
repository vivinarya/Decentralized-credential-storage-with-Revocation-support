// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DocumentStorage {
    struct Document {
        string ipfsCid;
        uint256 timestamp;
        bool revoked;
    }

    mapping(bytes32 => Document) private documents;
    address public owner;

    event DocumentStored(bytes32 indexed fileHash, string ipfsCid, uint256 timestamp);
    event DocumentRevoked(bytes32 indexed fileHash, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function storeDocument(bytes32 fileHash, string memory ipfsCid) public onlyOwner {
        require(documents[fileHash].timestamp == 0, "Document already stored");
        documents[fileHash] = Document(ipfsCid, block.timestamp, false);
        emit DocumentStored(fileHash, ipfsCid, block.timestamp);
    }

    function verifyDocument(bytes32 fileHash) public view returns (string memory ipfsCid, uint256 timestamp, bool revoked) {
        Document memory doc = documents[fileHash];
        require(doc.timestamp != 0, "Document not found");
        return (doc.ipfsCid, doc.timestamp, doc.revoked);
    }

    function revokeDocument(bytes32 fileHash) public onlyOwner {
        Document storage doc = documents[fileHash];
        require(doc.timestamp != 0, "Document not found");
        require(!doc.revoked, "Already revoked");
        doc.revoked = true;
        emit DocumentRevoked(fileHash, block.timestamp);
    }

    function isRevoked(bytes32 fileHash) public view returns (bool) {
        return documents[fileHash].revoked;
    }
}
