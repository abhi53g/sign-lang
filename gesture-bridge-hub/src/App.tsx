import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NotFoundPage from "./pages/NotFoundPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import TranslatePage from "./pages/TranslatePage";
import PoseSearchPage from "./pages/PoseSearchPage";
import DashboardPage from "./pages/DashboardPage";
import SignSchoolPage from "./pages/SignSchoolPage";
import LessonDetailPage from "./pages/LessonDetailPage";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/translate" element={<TranslatePage />} />
          <Route path="/sign-school" element={<SignSchoolPage />} />
          <Route path="/poses" element={<PoseSearchPage />} />
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/lesson/:lessonId" element={<LessonDetailPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Footer />
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
