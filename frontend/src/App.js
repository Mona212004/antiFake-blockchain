import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout & Home
import Navbar from './components/home/Navbar';
import Home from './components/home/Home';

// Manufacturer (Unified Role)
import Manufacturer from './components/pages/Manufacturer';
import AddProduct from './components/pages/AddProduct';
// Redundant import removed: ManufacturerDashboard

// Retailer (Update Role)
import Retailer from './components/pages/Retailer';
import ScannerPage from './components/pages/ScannerPage';
import UpdateProduct from './components/pages/UpdateProduct';

// Consumer & Verification (Read Role)
import Product from './components/pages/Product';

function App() {
  const [account, setAccount] = useState(null);
  const manufacturerAddress = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266".toLowerCase();

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0].toLowerCase());
        }

        // Listen for account changes globally
        window.ethereum.on('accountsChanged', (accounts) => {
          setAccount(accounts[0] ? accounts[0].toLowerCase() : null);
        });
      }
    };
    checkConnection();

    // Cleanup listener on unmount
    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', () => { });
      }
    };
  }, []);

  return (
    <>
      <Navbar account={account} setAccount={setAccount} />
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Unified Manufacturer Portal */}
        <Route path="/manufacturer" element={
          account === manufacturerAddress ? <Manufacturer /> : <Navigate to="/" />
        } />

        <Route path="/add-product" element={
          account === manufacturerAddress ? <AddProduct /> : <Navigate to="/" />
        } />

        <Route path="/retailer" element={<Retailer />} />
        <Route path="/scan" element={<ScannerPage account={account} />} />
        <Route path="/update-product/:id" element={<UpdateProduct />} />

        {/* Consumer Verification View */}
        <Route path="/product" element={<Product />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;