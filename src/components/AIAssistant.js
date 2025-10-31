import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../Firebase';

const AIAssistant = () => {
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const callGenerateContent = async () => {
    setLoading(true);
    setError('');
    setAiResponse('');

    try {
      const generateContent = httpsCallable(functions, 'generateContent');
      const result = await generateContent({ prompt: 'Write a short, encouraging message about learning to drive.' });
      
      const { text } = result.data;
      setAiResponse(text);
    } catch (err) {
      console.error("Cloud function call failed:", err);
      setError('Failed to get a response from the AI assistant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '8px', margin: '20px' }}>
      <h3>AI Driving Assistant</h3>
      <p>Click the button to get an encouraging message!</p>
      <button onClick={callGenerateContent} disabled={loading} className="btn btn-primary">
        {loading ? 'Thinking...' : 'Get Message'}
      </button>
      {aiResponse && <p style={{ marginTop: '20px', fontStyle: 'italic' }}>"{aiResponse}"</p>}
      {error && <p style={{ marginTop: '20px', color: 'red' }}>{error}</p>}
    </div>
  );
};

export default AIAssistant;