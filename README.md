# 🛡️ Blockchain Notar: DApp za Dokaz Postojanja i Integriteta Dokumenta

## O Projektu

Ovaj projekat predstavlja decentralizovanu aplikaciju (DApp) za "notarsku overu" elektronskih dokumenata korišćenjem Ethereum Blockchain-a. Aplikacija evidentira kriptografski otisak (hash) dokumenta, a ne sam sadržaj, čime garantuje **dokaz postojanja** i **integritet** u tačno određenom vremenu.

Kritična funkcionalnost je upotreba **Merkle Stabla** za ekonomičnu batch-overu, omogućavajući potvrdu integriteta velikog broja dokumenata jednom jedinom transakcijom.

### Ključne Funkcionalnosti

* **Pojedinačna Overa:** Evidentiranje jednog hash-a uz vremensku oznaku i deduplikaciju.
* **Batch Overa:** Agregacija više hash-eva u Merkle Root i upis korena na blockchain.
* **Verifikacija:** Provera da li je dokument overen i, u slučaju batch overe, dokazivanje pripadnosti tom batch-u pomoću kratkog kriptografskog dokaza (Merkle Proof).
* **Sigurnost:** Koristi `ethers.keccak256` za pouzdano hash-ovanje, osiguravajući da se hash funkcija poklapa i na front-endu i na pametnom ugovoru.

---

## ⚙️ Tehnologije

| Komponenta | Tehnologija | Svrha |
| :--- | :--- | :--- |
| **Blockchain** | Ethereum (Lokalna Hardhat Mreža) | Nepromenljivo skladište hash vrednosti. |
| **Pametni Ugovor** | Solidity (v0.8.24) + OpenZeppelin MerkleProof | Logika za overu, deduplikaciju i verifikaciju dokaza. |
| **Backend/Dev Okruženje** | Hardhat (Node.js) | Testiranje, lokalna mreža i deployment. |
| **Frontend** | React (Vite) + Ethers.js (v6) | Korisnički interfejs, komunikacija sa MetaMask-om i blockchainom. |
| **Kriptografija** | `ethers.keccak256` + `merkletreejs` | Generisanje hasheva i Merkle stabala. |

---
