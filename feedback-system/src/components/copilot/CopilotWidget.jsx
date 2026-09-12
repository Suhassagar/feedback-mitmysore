import React, { useEffect, useState, useRef } from 'react';
import useCopilotStore from '../../store/useCopilotStore';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../services/apiClient';
import GenerativeChart from './GenerativeChart';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { X, Mic } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Initialize socket outside component to prevent multiple connections
const socket = io(API_BASE_URL, {
  autoConnect: false,
  withCredentials: true
});

const CopilotWidget = () => {
  const { isOpen, toggleCopilot, messages, addMessage, updateLastMessage, setTyping, clearChat } = useCopilotStore();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [isListening, setIsListening] = useState(false);

  // Web Speech API Setup
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Voice Commands. Please use Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // Set explicit language
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Auto-send voice command
      setTimeout(() => {
        addMessage({ role: 'user', type: 'text', content: transcript });
        socket.emit('copilot_message', { message: transcript, location: location.pathname });
        setInput("");
        setTyping(true);
      }, 500);
    };
    recognition.onerror = (e) => {
      console.error("Speech Recognition Error:", e.error, e.message);
      
      let errorMsg = "Microphone error.";
      if (e.error === 'not-allowed') errorMsg = "Microphone access denied. Please allow it in your browser URL bar.";
      if (e.error === 'no-speech') errorMsg = "No speech detected. Please try again.";
      if (e.error === 'network') errorMsg = "Network error connecting to speech servers.";
      if (e.error === 'audio-capture') errorMsg = "No microphone found. Please connect a microphone.";
      
      toast.error(errorMsg);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  // Connect socket and register when user logs in and is an admin/hod
  useEffect(() => {
    if (user && user.role === 'department') {
      socket.connect();
      socket.emit('register_dashboard', { dept_id: user.dept_id });

      // Init copilot
      socket.emit('init_copilot', { dept_id: user.dept_id });
    }
    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Socket listeners
  useEffect(() => {
    socket.on('copilot_stream', (data) => {
      updateLastMessage(data.text);
      setTyping(true);
    });

    socket.on('copilot_stream_end', () => {
      setTyping(false);
    });

    socket.on('copilot_ui_command', (data) => {
      // Handle UI automation
      console.log("COPILOT UI COMMAND:", data);

      if (data.command === 'navigate_to') {
        let readableName = data.args.page.split('/')[1] || "dashboard";
        readableName = readableName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        addMessage({ role: 'model', type: 'text', content: `Navigating to **${readableName}**...` });
        let targetPath = data.args.page;
        const requiresDeptId = ['/manage-', '/add-course', '/department-', '/audit-logs', '/assign-subject'].some(prefix => targetPath.startsWith(prefix));

        if (requiresDeptId && !targetPath.includes(user.dept_id)) {
          if (targetPath.endsWith('/')) targetPath += user.dept_id;
          else targetPath += '/' + user.dept_id;
        }
        navigate(targetPath);
      }
      else if (data.command === 'create_session_modal') {
        addMessage({ role: 'model', type: 'text', content: `Opening session creation for Semester ${data.args.sem}, Section ${data.args.section}... Please review and click Create Session.` });
        navigate(`/manage-sessions/${user.dept_id}`);
        setTimeout(() => {
          useCopilotStore.getState().setUiIntent({ action: 'create_session', sem: data.args.sem, section: data.args.section });
        }, 500);
      }
      else if (data.command === 'generate_chart') {
        addMessage({ role: 'model', type: 'chart', content: data.args.title, metadata: data.args });
      }
      else if (data.command === 'confirm_action') {
        addMessage({ role: 'model', type: 'confirmation', content: data.args.title, metadata: data.args });
      }
      else if (data.command === 'show_action_list') {
        addMessage({ role: 'model', type: 'action_list', content: data.args.title, metadata: data.args });
      }
      else if (data.command === 'download_file') {
        const { filename, content, type } = data.args;
        const blob = new Blob([content], { type: type || 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        addMessage({ role: 'model', type: 'text', content: `✅ Generated and downloaded **${filename}** successfully.` });
        toast.success(`Downloaded ${filename}`);
      }
    });

    return () => {
      socket.off('copilot_stream');
      socket.off('copilot_stream_end');
      socket.off('copilot_ui_command');
    };
  }, [navigate, addMessage, updateLastMessage, setTyping]);

  // Auto scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    addMessage({ role: 'user', type: 'text', content: input });
    socket.emit('copilot_message', { message: input, location: location.pathname });
    setInput("");
    setTyping(true);
  };

  const handleConfirm = (action, args, isConfirmed) => {
    if (isConfirmed) {
      addMessage({ role: 'user', type: 'text', content: `[User Confirmed Action: ${action}]` });
      setTyping(true);
      socket.emit('execute_copilot_action', { action, args });
    } else {
      addMessage({ role: 'user', type: 'text', content: `[User Rejected Action: ${action}]` });
      socket.emit('copilot_message', { message: `I have cancelled the action.` });
    }
  };

  if (!user || user.role !== 'department') return null;

  return (
    <>
      <style>{`
        .markdown-content, .markdown-content * {
          color: #ffffff !important;
        }
        .markdown-content p { margin: 0 0 10px 0; }
        .markdown-content p:last-child { margin-bottom: 0; }
        .markdown-content ul, .markdown-content ol { margin: 8px 0; padding-left: 20px; }
        .markdown-content li { margin-bottom: 4px; }
        .markdown-content strong { color: #ffffff !important; font-weight: bold; }
        .markdown-content code { background: rgba(0,0,0,0.3) !important; padding: 2px 6px; border-radius: 4px; color: #93c5fd !important; }
      `}</style>
      {/* Floating Toggle Button */}
      <button
        className="copilot-toggle-btn hoverable"
        onClick={toggleCopilot}
        style={{
          position: 'fixed',
          bottom: '40px',
          right: '40px',
          width: '75px',
          height: '75px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)',
          padding: '4px',
          border: 'none',
          boxShadow: '0 10px 25px rgba(59, 130, 246, 0.5), 0 0 15px rgba(139, 92, 246, 0.4)',
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <img src="/sagar.jpeg" alt="SAGAR" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#0B1120', border: '2px solid rgba(255,255,255,0.2)' }}
          onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style="color:white;font-weight:bold;font-size:32px">S</span>'; }} />
      </button>

      {/* Spacious Pop-up Window */}
      <div
        className={`copilot-window ${isOpen ? 'open' : ''}`}
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '30px',
          width: '450px',
          height: '600px',
          background: 'rgba(20, 20, 30, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #3b82f6' }}>
            <img src="/sagar.jpeg" alt="SAGAR" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Sagar&background=3b82f6&color=fff'; }} />
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 600 }}>SAGAR</h3>
            <p style={{ margin: 0, color: '#a0a0a0', fontSize: '12px' }}>Enterprise AI Assistant</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={clearChat} style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: '12px' }}>
              Clear
            </button>
            <button onClick={toggleCopilot} style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>

              {msg.type === 'text' && (
                <div className="markdown-content" style={{
                  background: msg.role === 'user' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                  maxWidth: '85%',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  border: msg.role === 'model' ? '1px solid rgba(255,255,255,0.1)' : 'none'
                }}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}

              {msg.type === 'chart' && (
                <div style={{ width: '100%' }}>
                  <GenerativeChart title={msg.metadata.title} data={msg.metadata.data} />
                </div>
              )}

              {msg.type === 'confirmation' && (
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '16px',
                  borderRadius: '16px',
                  width: '100%',
                  marginTop: '8px'
                }}>
                  <p style={{ margin: '0 0 16px 0', color: '#fff', fontSize: '14px' }}>{msg.content}</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleConfirm(msg.metadata.action, msg.metadata, true)}
                      style={{ flex: 1, padding: '8px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                      ✅ Yes, Confirm
                    </button>
                    <button
                      onClick={() => handleConfirm(msg.metadata.action, msg.metadata, false)}
                      style={{ flex: 1, padding: '8px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                      ❌ No, Cancel
                    </button>
                  </div>
                </div>
              )}

              {msg.type === 'action_list' && (
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: '16px',
                  borderRadius: '16px',
                  width: '100%',
                  marginTop: '8px'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '15px' }}>{msg.content}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {msg.metadata.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '8px' }}>
                        <div>
                          <p style={{ margin: 0, color: '#fff', fontWeight: 600, fontSize: '14px' }}>{item.title}</p>
                          <p style={{ margin: 0, color: '#a0a0a0', fontSize: '12px' }}>{item.subtitle}</p>
                        </div>
                        <button
                          onClick={() => handleConfirm(item.action, item.args, true)}
                          style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                          {item.buttonText || "Confirm"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask SAGAR to navigate, analyze, or automate..."
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button type="button" onClick={startListening} style={{
            background: isListening ? '#ef4444' : 'rgba(255,255,255,0.1)',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            width: '45px',
            height: '45px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'background 0.3s'
          }}>
            <Mic size={20} />
          </button>
          <button type="submit" style={{
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            width: '45px',
            height: '45px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </>
  );
};

export default CopilotWidget;
