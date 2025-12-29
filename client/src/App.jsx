import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Signup from './pages/Signup';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import AuthCallback from './pages/AuthCallback';
import Admin from './pages/admin/Admin';
import ProductRegister from './pages/admin/ProductRegister';
import ProductManage from './pages/admin/ProductManage';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import OrderFailure from './pages/OrderFailure';
import OrderList from './pages/OrderList';
import OrderDetail from './pages/OrderDetail';
import Wishlist from './pages/Wishlist';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="signup" element={<Signup />} />
          <Route path="login" element={<Login />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route 
            path="admin" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="admin/products/register" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <ProductRegister />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="admin/products/manage" 
            element={
              <ProtectedRoute requireAdmin={true}>
                <ProductManage />
              </ProtectedRoute>
            } 
          />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route 
            path="cart" 
            element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="checkout" 
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="order/success" 
            element={
              <ProtectedRoute>
                <OrderSuccess />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="order/failure" 
            element={
              <ProtectedRoute>
                <OrderFailure />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="orders" 
            element={
              <ProtectedRoute>
                <OrderList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="orders/:id" 
            element={
              <ProtectedRoute>
                <OrderDetail />
              </ProtectedRoute>
            } 
          />
          <Route path="wishlist" element={<Wishlist />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
