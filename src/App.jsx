import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";
import Footer from "./components/structure/Footer.jsx";
import Header from "./components/structure/Header.jsx";
import Home from "./pages/Home.jsx";
import Articles from "./pages/Articles.jsx";
import Services from "./pages/Services.jsx";
import ArticleDetail from "./pages/ArticleDetail.jsx";
import NotFound from "./pages/NotFound.jsx";
import TestGraphQL from "./components/TestGraphQL.jsx";
import { getURI } from "./utils";
import "./App.scss";

// Universal Editor needs to connect to the author instance, not publish
const { REACT_APP_HOST_URI, REACT_APP_USE_PROXY } = process.env;
const aemConnectionURL = REACT_APP_USE_PROXY === "true" ? "/" : REACT_APP_HOST_URI;

function App() {
  return (
    <HelmetProvider>
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
        <Router>
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="/articles/:slug" element={<ArticleDetail />} />
              <Route path="/services" element={<Services />} />
              <Route path="/services/:slug" element={<Services />} />
              <Route path="/test-graphql" element={<TestGraphQL />} />
              <Route path="/*" element={<NotFound />} />
            </Routes>
          </main>
        </Router>
        <Footer />
      </div>
    </HelmetProvider>
  );
}

export default App;
