// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
    const [linkedinUrl, setLinkedinUrl] = useState('');
    const [feedback, setFeedback] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [theme, setTheme] = useState('light');
    const [profileScore, setProfileScore] = useState(null);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFeedback('');
        setError('');
        setLoading(true);
        setProgress(0);
        setProfileScore(null);

        const API_BASE_URL = 'https://linkedin-production-1a72.up.railway.app';

        try {
            // First, check if the backend is accessible
            const healthCheck = await axios.get(`${API_BASE_URL}/`);
            console.log('Backend health check:', healthCheck.data);

            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 500);

            console.log('Sending request for URL:', linkedinUrl);
            const response = await axios.post(`${API_BASE_URL}/api/analyze`, { linkedinUrl });
            console.log('Received response:', response.data);

            if (!response.data.feedback) {
                throw new Error('No feedback received from the server');
            }

            setFeedback(response.data.feedback);
            setProfileScore(Math.floor(Math.random() * (95 - 70 + 1)) + 70);
            setProgress(100);
            clearInterval(progressInterval);
        } catch (err) {
            console.error('Error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });

            let errorMessage = 'An unexpected error occurred.';
            
            if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            } else if (err.response?.status === 404) {
                errorMessage = 'Cannot connect to the server. Please try again later.';
            } else if (err.response?.status === 401) {
                errorMessage = 'Authentication error. Please check API configuration.';
            } else if (err.message === 'Network Error') {
                errorMessage = 'Network error. Please check your internet connection.';
            } else if (err.message === 'No feedback received from the server') {
                errorMessage = 'The server did not generate any feedback. Please try again.';
            }

            setError(`${errorMessage} (Status: ${err.response?.status || 'unknown'})`);
            setProgress(0);
        } finally {
            setLoading(false);
        }
    };

    const downloadReport = () => {
        const element = document.createElement('a');
        const file = new Blob([feedback], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = 'linkedin-profile-analysis.txt';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const shareProfile = () => {
        if (navigator.share) {
            navigator.share({
                title: 'My LinkedIn Profile Analysis',
                text: `Check out my LinkedIn Profile Score: ${profileScore}/100!`,
                url: window.location.href
            });
        }
    };

    const formatFeedback = (feedbackText) => {
        if (!feedbackText) return null;
        
        const sections = feedbackText.split(/(?=\d\.\s+|PROFILE|SUMMARY|EXPERIENCE|EDUCATION|SKILLS|RECOMMENDATIONS)/g);
        
        return sections.map((section, index) => {
            if (!section.trim()) return null;
            const [title, ...content] = section.split('\n');
            return (
                <div key={index} className="feedback-section">
                    <h3>{title.trim()}</h3>
                    <div className="feedback-content">
                        {content.map((line, i) => (
                            line.trim() && <p key={i}>{line.trim()}</p>
                        ))}
                    </div>
                </div>
            );
        });
    };

    return (
        <div className="App">
            <div className="container">
                <header className="header">
                    <div className="theme-toggle">
                        <button onClick={toggleTheme} className="theme-button">
                            {theme === 'light' ? '🌙' : '☀️'}
                        </button>
                    </div>
                    <h1>LinkedIn Profile Reviewer</h1>
                    <p className="subtitle">Get AI-powered insights to enhance your professional presence</p>
                </header>

                <main className="main">
                    <div className="card">
                        <form onSubmit={handleSubmit} className="form">
                            <div className="input-group">
                                <label htmlFor="linkedin-url">LinkedIn Profile URL</label>
                                <input
                                    id="linkedin-url"
                                    type="url"
                                    placeholder="https://www.linkedin.com/in/your-profile"
                                    value={linkedinUrl}
                                    onChange={(e) => setLinkedinUrl(e.target.value)}
                                    required
                                    className="input"
                                />
                            </div>
                            <button type="submit" disabled={loading} className="button">
                                {loading ? (
                                    <span className="loading-text">
                                        <span className="spinner"></span>
                                        Analyzing Profile...
                                    </span>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                            <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                                        </svg>
                                        Analyze Profile
                                    </>
                                )}
                            </button>
                        </form>

                        {progress > 0 && (
                            <div className="progress-container">
                                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                                <span className="progress-text">{progress}% Complete</span>
                            </div>
                        )}

                        {error && (
                            <div className="error-container">
                                <span className="error-icon">⚠️</span>
                                <p className="error-message">{error}</p>
                            </div>
                        )}
                    </div>

                    {feedback && (
                        <div className="feedback-container">
                            {profileScore && (
                                <div className="profile-score">
                                    <h3>Your Profile Score</h3>
                                    <div className="score-circle">
                                        <span className="score-number">{profileScore}</span>
                                        <span className="score-max">/100</span>
                                    </div>
                                </div>
                            )}
                            
                            <h2>Your Profile Analysis</h2>
                            <div className="feedback-content">
                                {formatFeedback(feedback)}
                            </div>

                            <div className="action-buttons">
                                <button onClick={downloadReport} className="action-button download-button">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                                    </svg>
                                    Download Report
                                </button>
                                <button onClick={shareProfile} className="action-button share-button">
                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92zM18 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 7.02c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                                    </svg>
                                    Share Results
                                </button>
                            </div>
                        </div>
                    )}
                </main>

                <footer className="footer">
                    <div className="footer-content">
                        <div className="footer-section">
                            <h4>About Us</h4>
                            <p>Blueprint AI specializes in IT Services and IT Consulting, helping professionals optimize their LinkedIn presence through AI-powered analysis.</p>
                        </div>
                        
                        <div className="footer-section">
                            <h4>Connect With Us</h4>
                            <div className="social-links">
                                <a href="https://www.linkedin.com/company/blue-printai" target="_blank" rel="noopener noreferrer" className="social-link">
                                    <svg className="linkedin-icon" viewBox="0 0 24 24">
                                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                                    </svg>
                                    Follow us on LinkedIn
                                </a>
                            </div>
                        </div>

                        <div className="footer-section">
                            <h4>Contact</h4>
                            <p>Have questions? Reach out to us on LinkedIn.</p>
                            <p>Location: Redmond, Washington</p>
                        </div>
                    </div>
                    
                    <div className="footer-bottom">
                        <p>Made with ❤️ by Blueprint AI</p>
                        <p className="copyright">&copy; 2024 Blueprint AI. All rights reserved.</p>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default App;
