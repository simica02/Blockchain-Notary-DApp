// --- KONAČNA KOMPLETNA VERZIJA ZA: client/src/App.jsx ---

import { useState } from 'react';
import { ethers } from 'ethers';
import { MerkleTree } from 'merkletreejs';
import { Buffer } from 'buffer';
import { contractAddress, contractABI } from './contract-info.js';
import './App.css';

window.Buffer = Buffer;

// Pomoćna funkcija za čitanje fajla
const readFileAsBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

// === 1. Konekcija na MetaMask i Ugovor ===
function App() {
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState("Čeka se konekcija...");
  
  // Stanja za Pojedinačnu overu
  const [singleFile, setSingleFile] = useState(null);
  
  // Stanja za Batch overu
  const [batchFiles, setBatchFiles] = useState(null);
  
  // Stanja za Verifikaciju
  const [verifyFile, setVerifyFile] = useState(null);
  const [verifyRoot, setVerifyRoot] = useState('');
  const [verifyProofFile, setVerifyProofFile] = useState(null);
  const [verificationResult, setVerificationResult] = useState('');


  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      setStatus("Greška: MetaMask nije instaliran.");
      return;
    }
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const userAccount = await signer.getAddress();

      const readOnlyContract = new ethers.Contract(contractAddress, contractABI, provider);
      const notaryContract = readOnlyContract.connect(signer);

      setContract(notaryContract);
      setAccount(userAccount);
      setStatus(`Povezan: ${userAccount}`);

    } catch (err) {
      console.error("KRITIČNA GREŠKA U connectWallet:", err);
      setStatus(`Greška pri konekciji: ${err.message}`);
    }
  };

  // === 2. ISPRAVNA HASH FUNKCIJA (Kritična) ===
  const hashFile = async (file) => {
    const buffer = await readFileAsBuffer(file);
    const fileBuffer = Buffer.from(buffer);
    // KORISTIMO ethers.keccak256 na Uint8Array-u!
    const hash = ethers.keccak256(new Uint8Array(fileBuffer)); 
    return hash; 
  };


  // === 3. Pojedinačna overa (Ispravljena) ===
  const handleSingleNotarize = async () => {
    if (!contract || !singleFile) {
      setStatus("Morate biti povezani i izabrati fajl.");
      return;
    }

    try {
      setStatus("Računanje hash-a...");
      const fileHash = await hashFile(singleFile);
      setStatus(`Hash fajla: ${fileHash}. Slanje na blockchain...`);

      const tx = await contract.notarizeSingle(fileHash); 
      setStatus("Čeka se potvrda transakcije...");
      await tx.wait();

      setStatus(`Uspešno overeno! Hash: ${fileHash}`);
      alert(`Fajl uspešno overen!\nHash: ${fileHash}\nTx: ${tx.hash}`);

    } catch (err) {
      console.error("GREŠKA U handleSingleNotarize:", err);
      let errorMessage = err.message;
      if (err.message.includes("Document already notarized")) {
        errorMessage = "Ovaj dokument je VEĆ OVEREN. Izaberi drugi fajl.";
      }
      setStatus(`Greška: ${errorMessage}`);
    }
  };
  
  // === 4. Batch overa (Vraćena funkcionalnost) ===
  const handleBatchNotarize = async () => {
    if (!contract || !batchFiles || batchFiles.length === 0) {
      setStatus("Morate biti povezani i izabrati bar 2 fajla.");
      return;
    }

    try {
      setStatus(`Računanje hash-eva za ${batchFiles.length} fajlova...`);
      const leavesHex = await Promise.all(
        [...batchFiles].map(file => hashFile(file))
      );
      
      setStatus("Kreiranje Merkle stabla...");
      // Konverzija u Buffer za MerkleTree
      const leaves = leavesHex.map(h => Buffer.from(h.slice(2), 'hex')); 
      
      // Koristimo isti keccak256 algoritam kao u Solidity-ju!
      const tree = new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
      const root = tree.getHexRoot(); 
      
      setStatus(`Merkle Root: ${root}. Slanje na blockchain...`);
      const tx = await contract.notarizeBatch(root);
      
      setStatus("Čeka se potvrda transakcije (1/1)...");
      await tx.wait();

      // Generisanje dokaza (proofs) za JSON download
      const proofs = {};
      leavesHex.forEach((leafHex, index) => {
        const proof = tree.getHexProof(leaves[index]);
        proofs[leafHex] = proof;
      });

      const dataToDownload = JSON.stringify({
        merkleRoot: root,
        transactionHash: tx.hash,
        proofs: proofs
      }, null, 2);
      
      // Pokreće automatsko preuzimanje JSON dokaza
      const blob = new Blob([dataToDownload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merkle_proofs_${root.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      setStatus(`Batch uspešno overen! Preuzmi JSON. Koren: ${root}`);

    } catch (err) {
      console.error("GREŠKA U handleBatchNotarize:", err);
      let errorMessage = err.message;
      if (errorMessage.includes("Batch root already notarized")) {
        errorMessage = "Ovaj batch (isti Merkle root) je VEĆ OVEREN.";
      }
      setStatus(`Greška: ${errorMessage}`);
    }
  };

  // === 5. Verifikacija (Dodata funkcionalnost) ===
  const handleVerify = async (mode) => {
    setVerificationResult('Proveravam...');
    try {
      const fileHash = await hashFile(verifyFile);

      if (mode === 'single') {
        // PROVERA 1: Pojedinačna overa
        const [exists, timestamp, owner] = await contract.verifySingle(fileHash);
        if (exists) {
          const date = new Date(Number(timestamp) * 1000);
          setVerificationResult(`✅ Dokument je overen!\nVreme: ${date.toLocaleString()}\nOverio: ${owner.slice(0, 8)}...`);
        } else {
          setVerificationResult(`❌ Dokument NIJE pronađen u pojedinačnoj evidenciji.`);
        }

      } else if (mode === 'batch') {
        // PROVERA 2: Batch overa (Merkle Proof)
        if (!verifyRoot || !verifyProofFile) {
          setVerificationResult('Molimo unesite Merkle Root i Merkle Proof JSON fajl.');
          return;
        }

        // Čitamo JSON fajl sa dokazima
        const proofData = JSON.parse(await verifyProofFile.text());
        
        // Uzimamo dokaz za naš hash
        const proof = proofData.proofs[fileHash];

        if (!proof) {
          setVerificationResult('❌ Nije pronađen dokaz (proof) za ovaj dokument u dostavljenom JSON fajlu.');
          return;
        }

        const isValid = await contract.verifyInBatch(verifyRoot, proof, fileHash);

        if (isValid) {
          setVerificationResult(`✅ DOKAZANO! Dokument je validan deo batch-a (Root: ${verifyRoot.slice(0, 8)}...).`);
        } else {
          setVerificationResult(`❌ Merkle Dokaz je NEVAŽEĆI. Ili root ne postoji ili fajl ne pripada tom batch-u.`);
        }
      }

    } catch (err) {
      console.error("GREŠKA U Verifikaciji:", err);
      setVerificationResult(`Greška: ${err.message}. Proveri konzolu za detalje.`);
    }
  };


  // === 6. UI (Izgled aplikacije) ===
  return (
    <div className="App">
      <header className="App-header">
          <h1>Blockchain Notar (DApp)</h1>
          {/* Uvek prikaži status */}
          <p className="status">{status}</p>
          
          {/* KONAČNA POPRAVKA: Uvek prikaži dugme, ili nalog, ali ne istovremeno */}
          {account ? (
            <p className="account-info">Povezan nalog: {account}</p>
          ) : (
            <button onClick={connectWallet}>
              Poveži se na MetaMask
            </button>
          )}
        </header>

      <main>
        {/* POJEDINAČNA OVERA */}
        <div className="card">
          <h2>Pojedinačna Overa</h2>
          <p>Hash dokumenta se upisuje direktno na blockchain.</p>
          <input type="file" onChange={(e) => setSingleFile(e.target.files[0])} />
          <button onClick={handleSingleNotarize} disabled={!contract || !singleFile}>
            Overi 1 Fajl
          </button>
        </div>

        {/* BATCH OVERA */}
        <div className="card">
          <h2>Batch Overa (Merkle Tree)</h2>
          <p>Mnoštvo hash-eva se agregira u jedan koren (root). Ekonomičnije.</p>
          <input type="file" multiple onChange={(e) => setBatchFiles(e.target.files)} />
          <button onClick={handleBatchNotarize} disabled={!contract || !batchFiles || batchFiles.length < 2}>
            Overi {batchFiles ? batchFiles.length : 0} Fajlova
          </button>
        </div>
        
        {/* PROVERA OVERE */}
        <div className="card verification-card">
          <h2>Provera Overe (Verifikacija)</h2>
          <p>Potrebna je originalna kopija dokumenta za proveru hash-a.</p>
          
          <input type="file" onChange={(e) => setVerifyFile(e.target.files[0])} />
          
          <div className="verification-buttons">
            <button onClick={() => handleVerify('single')} disabled={!contract || !verifyFile}>
              Proveri Pojedinačno
            </button>
          </div>

          <hr style={{margin: '1.5rem 0', border: '0', borderTop: '1px solid #ccc'}} />
          
          <h3>Verifikacija Batch-a (Merkle Dokaz)</h3>
          
          <input 
            type="text" 
            placeholder="Unesite Merkle Root (0x...)" 
            value={verifyRoot}
            onChange={(e) => setVerifyRoot(e.target.value)}
            style={{ width: '98%', padding: '8px', margin: '0.5rem 0' }}
          />

          <input type="file" onChange={(e) => setVerifyProofFile(e.target.files[0])} />
          
          <button onClick={() => handleVerify('batch')} disabled={!contract || !verifyFile || !verifyRoot || !verifyProofFile}>
            Proveri Merkle Dokaz
          </button>
          
          {verificationResult && (
            <div style={{ marginTop: '1rem', padding: '10px', backgroundColor: '#e9ffe9', border: '1px solid #c3e6cb', borderRadius: '4px', color: '#155724', whiteSpace: 'pre-wrap' }}>
              {verificationResult}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;