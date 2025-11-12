// Uvozimo sve što nam treba koristeći 'require' 
const { ethers } = require("hardhat");
const { expect } = require("chai");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("Notary Contract", function () {
  
  // Definišemo promenljive koje ćemo koristiti u testovima
  let notary;
  let owner;
  let leaves;
  let tree;
  let root;

  // Ovo se pokreće JEDNOM pre svih testova
  before(async () => {
    // 1. Uzimamo potpisnika (vlasnika ugovora)
    [owner] = await ethers.getSigners();

    // 2. Deploy-ujemo naš ugovor
    const NotaryFactory = await ethers.getContractFactory("Notary");
    notary = await NotaryFactory.deploy();

    // 3. PRIPREMA PODATAKA (Simuliramo front-end)
    const docs = ["doc1_content", "doc2_content", "doc3_content", "doc4_content"];
    leaves = docs.map(doc => keccak256(doc));

    // 4. KREIRANJE STABLA (Isto kao na front-endu)
    // VAŽNO: { sortPairs: true } je standard koji moramo pratiti
    tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

    // 5. Uzimamo koreni hash (root)
    root = tree.getHexRoot();
  });


  // === TEST 1: Batch Notarization ===
  it("Should allow batch notarization by storing a Merkle root", async function () {
    const tx = await notary.connect(owner).notarizeBatch(root);
    
    // Proveravamo da li je ugovor emitovao ispravan događaj
    const block = await ethers.provider.getBlock(tx.blockNumber);
    await expect(tx)
      .to.emit(notary, "BatchNotarized")
      .withArgs(root, owner.address, block.timestamp);

    // Proveravamo da li je root upisan u 'merkleRoots' mapu
    const info = await notary.merkleRoots(root);
    expect(info.owner).to.equal(owner.address);
  });

  // === TEST 2: Valid Batch Verification ===
  it("Should correctly verify a valid document leaf in a batch", async function () {
    // Podaci za dokaz:
    // Uzimamo hash prvog dokumenta ("doc1_content")
    const leafToProve = leaves[0]; 
    
    // Tražimo od drveta da nam da 'dokaz' (proof) za taj list
    const proof = tree.getHexProof(leafToProve);

    // Pozivamo funkciju za proveru na ugovoru
    const isValid = await notary.verifyInBatch(root, proof, leafToProve);

    // Očekujemo da ugovor vrati 'true'
    expect(isValid).to.be.true;
  });

  // === TEST 3: Invalid Batch Verification (Lažni dokument) ===
  it("Should REJECT an invalid document leaf", async function () {
    // Uzimamo dokaz za PRVI dokument
    const proof = tree.getHexProof(leaves[0]);
    
    // Ali pokušavamo da ga iskoristimo da dokažemo LAŽNI dokument
    const fakeLeaf = keccak256("fake_content");

    // Pitamo ugovor da li je lažni dokument deo batch-a
    const isValid = await notary.verifyInBatch(root, proof, fakeLeaf);

    // Očekujemo da ugovor vrati 'false'
    expect(isValid).to.be.false;
  });

  // === TEST 4: Invalid Batch Verification (Nepostojeći Root) ===
   it("Should REJECT a proof for a non-existent root", async function () {
    // Generišemo potpuno lažni root
    // U verziji ethers v5, keccak256 za string je 'ethers.utils.id()'
    const fakeRoot = ethers.id("fake_root_hash"); 
    const leafToProve = leaves[0];
    const proof = tree.getHexProof(leafToProve);

    const isValid = await notary.verifyInBatch(fakeRoot, proof, leafToProve);

    // Očekujemo 'false' jer 'fakeRoot' nikada nije overen
    expect(isValid).to.be.false;
   });

});