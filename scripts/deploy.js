// scripts/deploy.js

// Koristimo 'require' jer smo u Hardhat v2 (Node.js) okruženju
const { ethers } = require("hardhat");

async function main() {
  console.log("Počinjem deploy Notary ugovora...");

  // 1. Uzimamo "fabriku" za naš ugovor
  const NotaryFactory = await ethers.getContractFactory("Notary");

  // 2. Govorimo fabrici da pokrene deployment
  // Ovo šalje transakciju na mrežu
  const notary = await NotaryFactory.deploy();

  // 3. Čekamo da se transakcija potvrdi i da ugovor bude upisan na blockchain
  await notary.waitForDeployment();

  // 4. Ispisujemo adresu na koju je ugovor deploy-ovan
  // 'notary.target' je adresa u ethers v6+ (koji hardhat-toolbox koristi)
  console.log(`✅ Notary ugovor uspešno deploy-ovan na adresu: ${notary.target}`);
}

// Standardni Hardhat obrazac za izvršavanje i hvatanje grešaka
main().catch((error) => {
  console.error("Došlo je do greške prilikom deploymenta:");
  console.error(error);
  process.exit(1);
});