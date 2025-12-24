import React, { useState, useEffect } from 'react'; // Added useEffect here
import { Routes, Route, Navigate } from 'react-router-dom'; // Removed BrowserRouter/Router import

// Layout & Home
import Navbar from './components/home/Navbar';
import Home from './components/home/Home';

// Manufacturer (Generation Role)
import Manufacturer from './components/pages/Manufacturer';
import AddProduct from './components/pages/AddProduct';
import ManufacturerDashboard from './components/pages/ManufacturerDashboard';

// Retailer (Update Role)
import Retailer from './components/pages/Retailer';
import ScannerPage from './components/pages/ScannerPage';
import UpdateProduct from './components/pages/UpdateProduct';

// Consumer & Verification (Read Role)
import ProductDetails from './components/pages/AuthenticProduct';
import FakeProduct from './components/pages/FakeProduct';
import Product from './components/pages/Product';
import Admin from './components/pages/Admin';

function App() {
  const [account, setAccount] = useState(null);
  const manufacturerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase();

  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0].toLowerCase());
        }
      }
    };
    checkConnection();
  }, []);

  return (
    // Replaced <Router> with a Fragment <> because the Router is already in index.js
    <>
      <Navbar account={account} setAccount={setAccount} />
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Manufacturer-Only Routes */}
        <Route path="/manufacturer" element={
          account === manufacturerAddress ? <Manufacturer /> : <Navigate to="/" />
        } />
        <Route path="/add-product" element={
          account === manufacturerAddress ? <AddProduct /> : <Navigate to="/" />
        } />

        {/* Additional Manufacturer view if needed */}
        <Route path="/manufacturer-dashboard" element={
          account === manufacturerAddress ? <ManufacturerDashboard /> : <Navigate to="/" />
        } />

        {/* Retailer Routes */}
        <Route path="/retailer" element={<Retailer />} />
        <Route path="/scan" element={<ScannerPage />} />
        <Route path="/update-product/:id" element={<UpdateProduct />} />

        {/* Verification & General View */}
        <Route path="/verify/:id" element={<ProductDetails />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/fake" element={<FakeProduct />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </>
  );
}

export default App;