
import React, { useState } from 'react';
import './LighthouseAudit.css';
import EmissionRating from './EmissionRating'; // Import the new component

const LighthouseAudit = () => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [strategy, setStrategy] = useState('desktop');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const convertBytesToMB = (bytes) => (bytes / (1024 * 1024)).toFixed(2);

  const calculateCarbonFootprint = (sizeInMB) => {
    const carbonPerMB = 0.6 / 1.8;
    return (sizeInMB * carbonPerMB).toFixed(2);
  };

  const validateForm = () => {
    if (!url.trim()) {
      setError('URL is required.');
      return false;
    }
    if (!name.trim()) {
      setError('Name is required.');
      return false;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return false;
    }
    setError(null); // Clear previous errors if the form is valid
    return true;
  };
  
  const fetchAuditData = async () => {
    const apiKey = 'AIzaSyDE2uQD9el6VVvh_rNyEr8erL5cdv6Tavw';
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&key=${apiKey}`;

    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error('Failed to fetch audit data');
    const data = await response.json();

    const byteWeight = data.lighthouseResult.audits['total-byte-weight']?.numericValue;
    if (!byteWeight) throw new Error('Total byte weight not found in API response.');

    const sizeInMB = convertBytesToMB(byteWeight);
    const carbonFootprint = calculateCarbonFootprint(sizeInMB);

    return { device: strategy, MB: sizeInMB, grams: carbonFootprint };
  };

  const fetchData = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const auditData = await fetchAuditData();
      setResults(auditData);

      const response = await fetch('http://localhost:5000/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          url,
          results: {
            MB: auditData.MB,  // Page size in MB
            grams: auditData.grams,  // Carbon footprint in grams
          },
          deviceName: auditData.device,  // Device type (desktop or mobile)
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error('Failed to save data');
      }

      console.log(data);  // Handle the response data from the backend

    } catch (err) {
      setError(err.message);
      console.error('Error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h2>Website Carbon Footprint Calculator</h2>
      <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Enter URL" />
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your Email" />
      <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
        <option value="desktop">Desktop</option>
        <option value="mobile">Mobile</option>
      </select>
      <button onClick={fetchData} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze'}
      </button>
      {error && <p className="error">{error}</p>}
      {results && (
        <div>
          <p>Device: {results.device}</p>
          <p>Page Size: {results.MB} MB</p>
          <p>CO2 Emissions: {results.grams} g</p>
          {/* Display the emission rating */}
          <EmissionRating grams={parseFloat(results.grams)} />
        </div>
      )}
    </div>
  );
};

export default LighthouseAudit;
