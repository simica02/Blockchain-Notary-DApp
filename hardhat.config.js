// hardhat.config.js (Jednostavna "glupa" verzija)

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xkey";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24", // Ovo je ispravno

  networks: {
    // Definicija za 'localhost' je ugrađena, ali je ovako jasnije
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY !== '0xkey' ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    }
  }
};