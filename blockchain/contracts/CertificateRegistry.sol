// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
contract CertificateRegistry {
    address public immutable owner;
    mapping(address => bool) public anchorers;
    struct Anchor { bytes32 contentHash; uint64 anchoredAt; address issuer; }
    mapping(bytes32 => Anchor) private anchors;
    event AnchorerUpdated(address indexed account, bool allowed);
    event CertificateAnchored(bytes32 indexed recordIdHash, bytes32 indexed contentHash, address indexed issuer);
    error Unauthorized(); error AlreadyAnchored(); error InvalidHash();
    constructor() { owner = msg.sender; anchorers[msg.sender] = true; }
    function setAnchorer(address account, bool allowed) external { if (msg.sender != owner) revert Unauthorized(); anchorers[account] = allowed; emit AnchorerUpdated(account, allowed); }
    function anchorCertificate(bytes32 recordIdHash, bytes32 contentHash) external { if (!anchorers[msg.sender]) revert Unauthorized(); if (recordIdHash == bytes32(0) || contentHash == bytes32(0)) revert InvalidHash(); if (anchors[recordIdHash].anchoredAt != 0) revert AlreadyAnchored(); anchors[recordIdHash] = Anchor(contentHash, uint64(block.timestamp), msg.sender); emit CertificateAnchored(recordIdHash, contentHash, msg.sender); }
    function getAnchor(bytes32 recordIdHash) external view returns (Anchor memory) { return anchors[recordIdHash]; }
}

