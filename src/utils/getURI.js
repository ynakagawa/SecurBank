const { REACT_APP_PUBLISH_URI, REACT_APP_HOST_URI, REACT_APP_USE_PROXY } = process.env;

// Use REACT_APP_PUBLISH_URI if defined, otherwise fall back to REACT_APP_HOST_URI
const publishURI = REACT_APP_PUBLISH_URI || REACT_APP_HOST_URI;
const serviceURL = REACT_APP_USE_PROXY === "true" ? "/" : publishURI;

export const getURI = (path = "") => {
  // If path starts with /adobe/dynamicmedia/deliver/, ensure it points to publish
  // Always use the actual publish URL, not the proxy, for dynamic media URLs
  if (path && path.startsWith("/adobe/dynamicmedia/deliver/")) {
    console.log(path + "pub: " + publishURI);
    return publishURI + path;
  }
  
  // If path is already a full URL pointing to author, replace with publish
  if (path && typeof path === "string" && path.startsWith("http")) {
    // Check if it's pointing to an author instance
    if (path.includes("/adobe/dynamicmedia/deliver/")) {
      // Extract the path part after the domain
      const urlPath = path.replace(/^https?:\/\/[^\/]+/, "");
      // Always use the actual publish URL for dynamic media URLs
      return publishURI + urlPath;
    }
  }
  
  return serviceURL + path;
};
