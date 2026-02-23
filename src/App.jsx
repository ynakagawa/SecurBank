import React, { useCallback } from "react";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import { Security, LoginCallback } from "@okta/okta-react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import Footer from "./components/structure/Footer.jsx";
import Header from "./components/structure/Header.jsx";
import Home from "./pages/Home.jsx";
import Articles from "./pages/Articles.jsx";
import Services from "./pages/Services.jsx";
import ArticleDetail from "./pages/ArticleDetail.jsx";
import NotFound from "./pages/NotFound.jsx";
import TestGraphQL from "./components/TestGraphQL.jsx";
import { oktaAuth } from "./auth/oktaConfig.js";
import "./App.scss";

// Universal Editor needs to connect to the author instance, not publish
const { REACT_APP_HOST_URI, REACT_APP_USE_PROXY } = process.env;
const aemConnectionURL = REACT_APP_USE_PROXY === "true" ? "/" : REACT_APP_HOST_URI;

function AppRoutes() {
  const navigate = useNavigate();

  const restoreOriginalUri = useCallback(
    async (_oktaAuth, originalUri) => {
      navigate(originalUri || "/", { replace: true });
    },
    [navigate]
  );

  return (
    <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
      <div className="app">
        <Helmet>
          <script
            src="https://universal-editor-service.adobe.io/cors.js"
            async
          />
          <meta
            name="urn:adobe:aue:system:aemconnection"
            content={`aem:${aemConnectionURL}`}
          />
        </Helmet>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/articles/:slug" element={<ArticleDetail />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:slug" element={<Services />} />
            <Route path="/test-graphql" element={<TestGraphQL />} />
            <Route path="/login/callback" element={<LoginCallback />} />
            <Route path="/*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Security>
  );
}

function App() {
  return (
    <HelmetProvider>
      <Router>
        <AppRoutes />
      </Router>
    </HelmetProvider>
  );
}

export default App;
