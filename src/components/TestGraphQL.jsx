import React, { useState, useEffect } from 'react';
import aemHeadlessClient from '../api/aemHeadlessClient';
import { getAuthConfig, isServiceTokenAuth } from '../api/authService';

const TestGraphQL = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results = {};

    // Test 1: Check environment variables
    results.environment = {
      HOST_URI: process.env.REACT_APP_HOST_URI,
      GRAPHQL_ENDPOINT: process.env.REACT_APP_GRAPHQL_ENDPOINT,
      AUTH_METHOD: process.env.REACT_APP_AUTH_METHOD,
      USE_PROXY: process.env.REACT_APP_USE_PROXY,
      HAS_SERVICE_TOKEN: !!process.env.REACT_APP_SERVICE_TOKEN,
      ENDPOINT: process.env.REACT_APP_ENDPOINT,
    };

    // Test 2: Check authentication configuration
    results.auth = {
      isServiceTokenAuth: isServiceTokenAuth(),
      authConfig: getAuthConfig(),
      hasAuth: !!getAuthConfig(),
    };

    // Test 3: Test basic connectivity
    try {
      // Simple fetch test to check CORS and connectivity
      const response = await fetch(`${process.env.REACT_APP_HOST_URI}/content/graphql/global/endpoint.json`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      results.connectivity = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url,
      };
    } catch (error) {
      results.connectivity = {
        error: error.message,
        type: error.name,
      };
    }

    // Test 4: Test GraphQL with authentication
    try {
      const query = `
        query {
          __schema {
            types {
              name
            }
          }
        }
      `;
      
      const graphqlResponse = await aemHeadlessClient.runQuery(query);
      results.graphql = {
        success: true,
        data: graphqlResponse.data ? 'Data received' : 'No data',
        typeCount: graphqlResponse.data?.__schema?.types?.length || 0,
      };
    } catch (error) {
      results.graphql = {
        success: false,
        error: error.message,
        type: error.name,
        stack: error.stack,
      };
    }

    // Test 5: Test persisted query
    try {
      const persistedResponse = await aemHeadlessClient.runPersistedQuery(
        `${process.env.REACT_APP_ENDPOINT}/page-by-slug`,
        { slug: 'home', variation: 'master' }
      );
      
      results.persistedQuery = {
        success: true,
        data: persistedResponse.data ? 'Data received' : 'No data',
        hasPages: !!persistedResponse.data?.pageList?.items?.length,
      };
    } catch (error) {
      results.persistedQuery = {
        success: false,
        error: error.message,
        type: error.name,
      };
    }

    setTestResults(results);
    setLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const formatResult = (result) => {
    return JSON.stringify(result, null, 2);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>AEM GraphQL Connection Test</h2>
      
      <button 
        onClick={runTests} 
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          marginBottom: '20px',
          backgroundColor: loading ? '#ccc' : '#007cba',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Running Tests...' : 'Run Tests'}
      </button>

      {Object.keys(testResults).length > 0 && (
        <div>
          <h3>Test Results:</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <h4>1. Environment Configuration</h4>
            <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
              {formatResult(testResults.environment)}
            </pre>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4>2. Authentication Configuration</h4>
            <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
              {formatResult(testResults.auth)}
            </pre>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4>3. Basic Connectivity Test</h4>
            <pre style={{ 
              backgroundColor: testResults.connectivity?.error ? '#ffebee' : '#e8f5e8', 
              padding: '10px', 
              borderRadius: '4px' 
            }}>
              {formatResult(testResults.connectivity)}
            </pre>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4>4. GraphQL Schema Test</h4>
            <pre style={{ 
              backgroundColor: testResults.graphql?.success ? '#e8f5e8' : '#ffebee', 
              padding: '10px', 
              borderRadius: '4px' 
            }}>
              {formatResult(testResults.graphql)}
            </pre>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4>5. Persisted Query Test</h4>
            <pre style={{ 
              backgroundColor: testResults.persistedQuery?.success ? '#e8f5e8' : '#ffebee', 
              padding: '10px', 
              borderRadius: '4px' 
            }}>
              {formatResult(testResults.persistedQuery)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestGraphQL; 