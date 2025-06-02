import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../ui/Navbar';
import Footer from '../ui/Footer';

const MainLayout = () => {
  return (
    // Thay thế div bằng thẻ semantic
    <div className="flex flex-col min-h-screen" role="document">
      <Navbar />
      <main className="flex-grow" id="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;