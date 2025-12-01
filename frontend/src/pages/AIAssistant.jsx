import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Sparkles, Lightbulb, Zap, X, Minimize2, Maximize2 } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [quickActions, setQuickActions] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    // Load role-specific suggestions
    loadSuggestions();
    loadQuickActions();
    
    // Welcome message
    setMessages([{
      type: 'assistant',
      content: `Hello ${user.username}! 👋\n\nI'm your AI Assistant for Network Inventory Management.\n\nHow can I help you today?`,
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSuggestions = async () => {
    try {
      const response = await axios.get(`${API_URL}/ai-assistant/suggestions/${user.role}`);
      setSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const loadQuickActions = async () => {
    try {
      const response = await axios.get(`${API_URL}/ai-assistant/quick-actions/${user.role}`);
      setQuickActions(response.data.actions);
    } catch (error) {
      console.error('Error loading quick actions:', error);
    }
  };

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim()) return;

    // Add user message
    const userMessage = {
      type: 'user',
      content: messageText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Call AI Assistant API
      const response = await axios.post(`${API_URL}/ai-assistant/chat`, {
        message: messageText,
        role: user.role,
        context: null
      });

      // Add assistant response
      const assistantMessage = {
        type: 'assistant',
        content: response.data.response,
        suggestions: response.data.suggestions,
        data: response.data.data,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        type: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestionQuery) => {
    sendMessage(suggestionQuery);
  };

  const formatMessage = (content) => {
    // Convert markdown-style formatting
    return content
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('**') && line.endsWith(':**')) {
          return <h4 key={i} style={{ margin: '1rem 0 0.5rem 0', fontSize: '1rem' }}>{line.replace(/\*\*/g, '')}</h4>;
        }
        // Bold text
        if (line.includes('**')) {
          const parts = line.split('**');
          return (
            <p key={i} style={{ margin: '0.25rem 0' }}>
              {parts.map((part, j) => 
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              )}
            </p>
          );
        }
        // Bullet points
        if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
          return <li key={i} style={{ marginLeft: '1.5rem' }}>{line.replace(/^[-•]\s*/, '')}</li>;
        }
        // Numbered lists
        if (/^\d+\./.test(line.trim())) {
          return <li key={i} style={{ marginLeft: '1.5rem' }}>{line.replace(/^\d+\.\s*/, '')}</li>;
        }
        // Empty lines
        if (line.trim() === '') {
          return <br key={i} />;
        }
        // Regular text
        return <p key={i} style={{ margin: '0.25rem 0' }}>{line}</p>;
      });
  };

  if (isMinimized) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 1000
      }}>
        <button
          onClick={() => setIsMinimized(false)}
          className="btn btn-primary"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            position: 'relative'
          }}
        >
          <Sparkles size={28} />
          {quickActions.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: '#ef4444',
              color: 'white',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}>
              {quickActions.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: isExpanded ? '0' : '2rem',
      right: isExpanded ? '0' : '2rem',
      width: isExpanded ? '100vw' : '420px',
      height: isExpanded ? '100vh' : '600px',
      maxHeight: isExpanded ? '100vh' : 'calc(100vh - 4rem)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      background: 'white',
      borderRadius: isExpanded ? '0' : '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Sparkles size={24} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>AI Assistant</h3>
            <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
              Role: {user.role}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div style={{
          padding: '0.75rem 1.5rem',
          background: '#fef3c7',
          borderBottom: '1px solid #fbbf24'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Zap size={16} color="#f59e0b" />
            <strong style={{ fontSize: '0.875rem' }}>Quick Actions</strong>
          </div>
          {quickActions.map((action, i) => (
            <div key={i} style={{
              fontSize: '0.8125rem',
              padding: '0.5rem',
              background: 'white',
              borderRadius: '6px',
              marginBottom: '0.5rem',
              border: '1px solid #fbbf24'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{action.title}</div>
              <div style={{ color: '#6b7280' }}>{action.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem',
        background: '#f9fafb'
      }}>
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: message.type === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: message.type === 'user' ? '#667eea' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.25rem',
              flexShrink: 0
            }}>
              {message.type === 'user' ? '👤' : '🤖'}
            </div>
            <div style={{ flex: 1, maxWidth: '80%' }}>
              <div style={{
                background: message.type === 'user' ? '#667eea' : 'white',
                color: message.type === 'user' ? 'white' : '#1f2937',
                padding: '1rem',
                borderRadius: '12px',
                fontSize: '0.9375rem',
                lineHeight: '1.6',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                {formatMessage(message.content)}
              </div>
              
              {/* Message Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {message.suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = '#f3f4f6';
                        e.target.style.borderColor = '#667eea';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'white';
                        e.target.style.borderColor = '#e5e7eb';
                      }}
                    >
                      <Lightbulb size={14} />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              
              <div style={{
                fontSize: '0.75rem',
                color: '#9ca3af',
                marginTop: '0.5rem'
              }}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.25rem'
            }}>
              🤖
            </div>
            <div style={{
              background: 'white',
              padding: '1rem',
              borderRadius: '12px',
              display: 'flex',
              gap: '0.5rem'
            }}>
              <div className="loading-dot"></div>
              <div className="loading-dot" style={{ animationDelay: '0.2s' }}></div>
              <div className="loading-dot" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions Bar */}
      {suggestions.length > 0 && messages.length === 1 && (
        <div style={{
          padding: '1rem 1.5rem',
          background: 'white',
          borderTop: '1px solid #e5e7eb'
        }}>
          <div style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Lightbulb size={16} />
            Try asking:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {suggestions.slice(0, 3).map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(suggestion.query)}
                style={{
                  padding: '0.75rem',
                  background: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#e5e7eb';
                  e.target.style.borderColor = '#667eea';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#f3f4f6';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{suggestion.title}</div>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>"{suggestion.query}"</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '1rem 1.5rem',
        background: 'white',
        borderTop: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              resize: 'none',
              minHeight: '44px',
              maxHeight: '120px',
              fontFamily: 'inherit'
            }}
            rows={1}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="btn btn-primary"
            style={{
              width: '44px',
              height: '44px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      <style>{`
        .loading-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #9ca3af;
          animation: loading-bounce 1.4s infinite ease-in-out both;
        }
        
        @keyframes loading-bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default AIAssistant;