// Configuration des routes de l'application (React Router).
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import RoleRoute from "../components/common/RoleRoute";
import MainLayout from "../layouts/MainLayout";
import Home from "../pages/Home";
import Login from "../pages/Login";
import NotFound from "../pages/NotFound";
import AdminDashboard from "../pages/AdminDashboard";
import ProductDetail from "../pages/ProductDetail";
import ProductSearch from "../pages/ProductSearch";
import ProfessionalDetail from "../pages/ProfessionalDetail";
import ProfessionalDashboard from "../pages/ProfessionalDashboard";
import ProfessionalSearch from "../pages/ProfessionalSearch";
import MerchantDashboard from "../pages/MerchantDashboard";
import Profile from "../pages/Profile";
import Register from "../pages/Register";
import StoreDetail from "../pages/StoreDetail";
import type { UserRole } from "../types";

export default function AppRoutes() {
  const merchantRole: UserRole[] = ["COMMERCANT"];
  const proRole: UserRole[] = ["PROFESSIONNEL"];
  const adminRole: UserRole[] = ["ADMIN"];

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/recherche" element={<ProductSearch />} />
        <Route path="/produits/:id" element={<ProductDetail />} />
        <Route path="/boutiques/:id" element={<StoreDetail />} />
        <Route path="/professionnels" element={<ProfessionalSearch />} />
        <Route path="/professionnels/:id" element={<ProfessionalDetail />} />

        <Route path="/commercant" element={<RoleRoute roles={merchantRole}><MerchantDashboard /></RoleRoute>} />
        <Route path="/professionnel" element={<RoleRoute roles={proRole}><ProfessionalDashboard /></RoleRoute>} />
        <Route path="/admin" element={<RoleRoute roles={adminRole}><AdminDashboard /></RoleRoute>} />

        <Route
          path="/profil"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}