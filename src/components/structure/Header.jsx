import React from "react";
import { useOktaAuth } from "@okta/okta-react";
import Logo from "../Logo";
import RedirectButton from "../RedirectButton";
import "./Header.scss";

const Header = () => {
  const { oktaAuth, authState } = useOktaAuth();

  const navigations = [
    { label: "Services", href: "/services" },
    { label: "Articles", href: "/articles" },
  ];

  // Universal Editor (and any other host) loads the app inside an iframe.
  // signInWithRedirect() navigates the iframe itself, breaking the UE shell.
  // Use signInWithPopup() inside iframes so the Okta dialog opens as a
  // separate top-level window and the iframe stays in place.
  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const handleSignIn = async () => {
    if (isInIframe) {
      try {
        await oktaAuth.signInWithPopup();
      } catch (err) {
        // Popup was blocked or closed — fall back to top-level redirect so the
        // user always has a path to authenticate.
        if (err.name !== "UserCancelledError") {
          window.top.location.href =
            window.location.origin + "/login?redirectTo=" + encodeURIComponent(window.location.href);
        }
      }
    } else {
      oktaAuth.signInWithRedirect();
    }
  };

  const handleSignOut = () => {
    oktaAuth.signOut();
  };

  const isAuthenticated = authState?.isAuthenticated;
  const userName =
    authState?.idToken?.claims?.name ||
    authState?.idToken?.claims?.email ||
    null;

  return (
    <header className="background-blue">
      <div className="container header">
        <div className="navigations-wrapper">
          <Logo variant="light" />
          <nav>
            {navigations.map(({ label, href }, index) => (
              <a
                key={`${href}_${index}`}
                href={href}
                className="font-size-medium font-weight-medium color-light hover-effect"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
        <div className="buttons-wrapper">
          {isAuthenticated ? (
            <>
              {userName && (
                <span className="font-size-medium font-weight-medium color-light user-greeting">
                  Hi, {userName}
                </span>
              )}
              <button
                className="transparent font-size-medium hover-effect"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              className="transparent font-size-medium hover-effect"
              onClick={handleSignIn}
            >
              Sign In
            </button>
          )}
          <RedirectButton className="font-size-medium hover-effect">
            Open an Account
          </RedirectButton>
        </div>
      </div>
    </header>
  );
};

export default Header;
