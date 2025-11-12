// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// UVOZIMO KLJUČNU BIBLIOTEKU ZA VERIFIKACIJU
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Notary {

    // === Strukture za čuvanje podataka ===
    struct NotarizationInfo {
        uint256 timestamp; // Vreme bloka kada je overeno
        address owner;     // Ko je overio
    }

    // === Mape za skladištenje ===
    // Čuva pojedinačne haševe: hash -> podaci o overi
    mapping(bytes32 => NotarizationInfo) public singleHashes;

    // Čuva korene Merkle stabala (za batch-eve): root -> podaci o overi
    mapping(bytes32 => NotarizationInfo) public merkleRoots;

    // === Događaji (Events) ===
    event DocumentNotarized(
        bytes32 indexed documentHash,
        address indexed owner,
        uint256 timestamp
    );
    
    event BatchNotarized(
        bytes32 indexed merkleRoot,
        address indexed owner,
        uint256 timestamp
    );

    // === Funkcija 1: Pojedinačna overa ===
    function notarizeSingle(bytes32 _documentHash) external {
        require(singleHashes[_documentHash].timestamp == 0, "Document already notarized");

        singleHashes[_documentHash] = NotarizationInfo({
            timestamp: block.timestamp,
            owner: msg.sender
        });

        emit DocumentNotarized(_documentHash, msg.sender, block.timestamp);
    }

    // === Funkcija 2: Batch overa (upis Merkle Root) ===
    function notarizeBatch(bytes32 _merkleRoot) external {
        require(merkleRoots[_merkleRoot].timestamp == 0, "Batch root already notarized");

        merkleRoots[_merkleRoot] = NotarizationInfo({
            timestamp: block.timestamp,
            owner: msg.sender
        });

        emit BatchNotarized(_merkleRoot, msg.sender, block.timestamp);
    }

    // === Funkcija 3: Provera pojedinačne overe ===
    function verifySingle(bytes32 _documentHash)
        external
        view
        returns (bool exists, uint256 timestamp, address owner)
    {
        NotarizationInfo storage info = singleHashes[_documentHash];
        if (info.timestamp > 0) {
            return (true, info.timestamp, info.owner);
        }
        return (false, 0, address(0));
    }

    // === Funkcija 4: Provera Batch overe (pomoću Merkle dokaza) ===
    function verifyInBatch(
        bytes32 _merkleRoot,
        bytes32[] calldata _proof,
        bytes32 _leaf
    ) external view returns (bool) {
        
        bool rootExists = merkleRoots[_merkleRoot].timestamp > 0;
        if (!rootExists) {
            return false;
        }

        return MerkleProof.verify(_proof, _merkleRoot, _leaf);
    }
}