import React, { useEffect, useState, useRef } from 'react';
import useCopilotStore from '../../store/useCopilotStore';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../services/apiClient';
import GenerativeChart from './GenerativeChart';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { 
  X, 
  Mic, 
  RotateCcw, 
  ChevronRight, 
  Sparkles, 
  BarChart3, 
  PlusCircle, 
  FileSpreadsheet, 
  Clock 
} from 'lucide-react';
import useDraggableWidget from '../../hooks/useDraggableWidget';
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

  const ICON_SIZE = 58;
  const {
    position,
    setPosition,
    isDragging,
    isGhosted,
    resetToDefault,
    resetIdleTimer,
    dragProps
  } = useDraggableWidget({
    storageKey: 'sagar_copilot_coords',
    elementSize: ICON_SIZE,
    margin: 16,
    idleTimeoutMs: 5000,
    isWindowOpen: isOpen
  });

  // Calculate adaptive quadrant placement for the chat window
  const getWindowPlacement = () => {
    if (typeof window === 'undefined') return {};
    const isMobile = window.innerWidth <= 600;
    if (isMobile) {
      return {
        left: '16px',
        right: '16px',
        bottom: '20px',
        top: 'auto',
        width: 'calc(100vw - 32px)',
        maxHeight: 'min(76vh, 540px)'
      };
    }

    const winWidth = 440;
    const winHeight = Math.min(600, window.innerHeight - 36);
    const margin = 16;

    // Check which quadrant the icon is in
    const isRight = position.x > window.innerWidth / 2;
    const isBottom = position.y > window.innerHeight / 2;

    let targetLeft, targetTop;

    if (isRight) {
      targetLeft = Math.max(margin, position.x + ICON_SIZE - winWidth);
    } else {
      targetLeft = Math.min(window.innerWidth - winWidth - margin, position.x);
    }

    if (isBottom) {
      targetTop = Math.max(margin, position.y - winHeight - 12);
    } else {
      targetTop = Math.min(window.innerHeight - winHeight - margin, position.y + ICON_SIZE + 12);
    }

    return {
      left: `${targetLeft}px`,
      top: `${targetTop}px`,
      width: `${winWidth}px`,
      height: `${winHeight}px`,
      bottom: 'auto',
      right: 'auto'
    };
  };

  const windowPlacement = getWindowPlacement();

  // Outside speech bubble state
  const [isBubbleVisible, setIsBubbleVisible] = useState(() => {
    try {
      return sessionStorage.getItem('sagar_bubble_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  // Auto-dismiss bubble after 7 seconds if closed
  useEffect(() => {
    if (isBubbleVisible && !isOpen) {
      const timer = setTimeout(() => {
        setIsBubbleVisible(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [isBubbleVisible, isOpen]);

  const dismissBubble = (e) => {
    if (e) e.stopPropagation();
    setIsBubbleVisible(false);
    try {
      sessionStorage.setItem('sagar_bubble_dismissed', 'true');
    } catch {
      // Ignore
    }
  };

  // Re-evaluate bubble when route changes if not dismissed in session
  useEffect(() => {
    try {
      if (sessionStorage.getItem('sagar_bubble_dismissed') !== 'true' && !isOpen) {
        setIsBubbleVisible(true);
      }
    } catch {
      // Ignore
    }
  }, [location.pathname, isOpen]);

  // Context-aware micro-tip generator
  const getRouteContextTip = () => {
    const path = location.pathname;
    if (user?.role === 'admin') {
      if (path.includes('/admin/departments')) {
        return {
          badge: "Executive Intel",
          text: "Ask me: 'Compare all departments' or 'Show campus overview statistics'."
        };
      }
      if (path.includes('/admin/analytics')) {
        return {
          badge: "Campus Analytics",
          text: "Ask me: 'Which department has highest ratings?' or 'Compare turnout across units'."
        };
      }
      return {
        badge: "Admin Copilot",
        text: "Hi Dr. Principal! I can query campus-wide feedback, benchmark departments, and audit faculty."
      };
    }
    if (path.includes('/manage-questions')) {
      return {
        badge: "Form Builder",
        text: "Need help configuring submission dwell time or drafting questions? Click to ask me!"
      };
    }
    if (path.includes('/manage-sessions')) {
      return {
        badge: "Session Manager",
        text: "I can automate new feedback sessions for any semester or section. Click to try!"
      };
    }
    if (path.includes('/manage-faculty')) {
      return {
        badge: "Faculty Roster",
        text: "Ask me: 'Which faculty have ratings below 3.0?' for an instant appraisal audit."
      };
    }
    if (path.includes('/department-settings')) {
      return {
        badge: "Settings",
        text: "Ask me to adjust department parameters or review audit logs."
      };
    }
    return {
      badge: "AI Copilot Ready",
      text: "Hi! I am SAGAR, your Department AI. Click to navigate, analyze ratings, or schedule feedback."
    };
  };

  const routeTip = getRouteContextTip();

  // Dynamic bubble placement calculation based on draggable position
  const getBubblePlacement = () => {
    if (typeof window === 'undefined') return {};
    const isMobile = window.innerWidth <= 600;
    if (isMobile) {
      return {
        bottom: '86px',
        right: '16px',
        left: '16px',
        maxWidth: 'calc(100vw - 32px)'
      };
    }

    const isRight = position.x > window.innerWidth / 2;
    const bubbleWidth = 280;

    let style = {
      maxWidth: `${bubbleWidth}px`,
      top: `${Math.max(16, Math.min(window.innerHeight - 110, position.y - 8))}px`
    };

    if (isRight) {
      style.right = `${window.innerWidth - position.x + 12}px`;
      style.left = 'auto';
    } else {
      style.left = `${position.x + ICON_SIZE + 12}px`;
      style.right = 'auto';
    }

    return style;
  };

  // Helper to send a prompt directly from 1-click interactive action chips
  const handleSendPrompt = (promptText) => {
    if (!promptText || !promptText.trim()) return;
    addMessage({ role: 'user', type: 'text', content: promptText });
    socket.emit('copilot_message', { message: promptText, location: location.pathname });
    setInput("");
    setTyping(true);
  };

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
    if (user && (user.role === 'department' || user.role === 'admin')) {
      socket.connect();
      if (user.role === 'department') {
        socket.emit('register_dashboard', { dept_id: user.dept_id });
        socket.emit('init_copilot', { role: 'department', dept_id: user.dept_id });
      } else if (user.role === 'admin') {
        socket.emit('init_copilot', { role: 'admin' });
      }
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

        if (user?.role === 'department' && requiresDeptId && user?.dept_id && !targetPath.includes(user.dept_id)) {
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
        
        @keyframes sagarPulseRing {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.22); opacity: 0; }
          100% { transform: scale(1.22); opacity: 0; }
        }

        @keyframes sagarGreetingWave {
          0% { transform: rotate(0deg); }
          15% { transform: rotate(14deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(14deg); }
          60% { transform: rotate(-6deg); }
          75% { transform: rotate(8deg); }
          100% { transform: rotate(0deg); }
        }

        @keyframes sagarBubbleSlideIn {
          from { opacity: 0; transform: translateY(6px) scale(0.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 600px) {
          .copilot-window {
            width: calc(100vw - 32px) !important;
            max-width: calc(100vw - 32px) !important;
            left: 16px !important;
            right: 16px !important;
            bottom: 20px !important;
            top: auto !important;
            height: 75vh !important;
            max-height: 540px !important;
            border-radius: 18px !important;
          }
        }
      `}</style>

      {/* Outside Floating Ambient Speech Bubble / Gesture Callout */}
      {!isOpen && isBubbleVisible && !isDragging && (
        <div
          className="sagar-speech-bubble"
          onClick={toggleCopilot}
          style={{
            position: 'fixed',
            ...getBubblePlacement(),
            background: 'rgba(15, 23, 42, 0.94)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.5), 0 0 16px rgba(37, 99, 235, 0.25)',
            borderRadius: '14px',
            padding: '10px 14px',
            zIndex: 9997,
            cursor: 'pointer',
            animation: 'sagarBubbleSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                color: '#FFFFFF',
                fontSize: '10px',
                fontWeight: '700',
                padding: '1px 6px',
                borderRadius: '4px',
                letterSpacing: '0.4px',
                textTransform: 'uppercase'
              }}>
                {routeTip.badge}
              </span>
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '500' }}>
                SAGAR
              </span>
            </div>

            <button
              type="button"
              onClick={dismissBubble}
              aria-label="Dismiss greeting"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
            >
              <X size={13} />
            </button>
          </div>

          <p style={{
            margin: '2px 0 0 0',
            fontSize: '12px',
            color: '#F1F5F9',
            lineHeight: '1.4',
            fontWeight: '400'
          }}>
            {routeTip.text}
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10.5px',
            color: '#60A5FA',
            fontWeight: '600',
            marginTop: '3px'
          }}>
            <span>Click to chat or drag anywhere</span>
            <ChevronRight size={12} />
          </div>
        </div>
      )}

      {/* Free-Floating Draggable Toggle Button */}
      <div
        className="copilot-toggle-btn hoverable"
        onPointerDown={dragProps.onPointerDown}
        onPointerMove={dragProps.onPointerMove}
        onPointerUp={(e) => dragProps.onPointerUp(e, toggleCopilot)}
        onPointerCancel={dragProps.onPointerCancel}
        onMouseEnter={resetIdleTimer}
        title="SAGAR Assistant — Click to open, Drag anywhere to move"
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${ICON_SIZE}px`,
          height: `${ICON_SIZE}px`,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #4F46E5 100%)',
          padding: '2.5px',
          boxShadow: isDragging 
            ? '0 20px 35px -5px rgba(37, 99, 235, 0.55), 0 0 20px rgba(59, 130, 246, 0.6)'
            : '0 10px 25px -4px rgba(37, 99, 235, 0.45), 0 0 14px rgba(59, 130, 246, 0.35)',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          touchAction: 'none',
          userSelect: 'none',
          opacity: 1,
          transform: isDragging ? 'scale(1.1)' : 'scale(1)',
          transition: isDragging 
            ? 'opacity 0.2s, box-shadow 0.2s' 
            : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease'
        }}
      >
        {/* Ambient Greeting Pulse Ring */}
        {!isOpen && isBubbleVisible && (
          <span style={{
            position: 'absolute',
            inset: '-5px',
            borderRadius: '50%',
            border: '2px solid rgba(59, 130, 246, 0.65)',
            animation: 'sagarPulseRing 2s infinite',
            pointerEvents: 'none'
          }} />
        )}

        <img 
          src="/sagar.jpeg" 
          alt="SAGAR" 
          draggable="false"
          style={{ 
            width: '100%', 
            height: '100%', 
            borderRadius: '50%', 
            objectFit: 'cover', 
            background: '#0B1120', 
            border: '2px solid rgba(255,255,255,0.85)',
            pointerEvents: 'none',
            animation: (!isOpen && isBubbleVisible) ? 'sagarGreetingWave 1.4s ease-in-out' : 'none'
          }}
          onError={(e) => { 
            e.target.style.display = 'none'; 
            if (e.target.parentElement) {
              e.target.parentElement.innerHTML = '<span style="color:white;font-weight:bold;font-size:22px">S</span>'; 
            }
          }} 
        />
        {/* Active AI Pulse Beacon */}
        <span style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#10B981',
          border: '2px solid #FFFFFF',
          boxShadow: '0 0 6px #10B981',
          pointerEvents: 'none'
        }} />
      </div>

      {/* Mobile Context Scrim (UIUX-002) - Dims and blurs background on mobile so chat focus is clear */}
      {isOpen && (
        <div
          className="copilot-backdrop"
          onClick={toggleCopilot}
          aria-label="Close SAGAR Assistant"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 10, 25, 0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 9995,
            animation: 'fadeIn 0.2s ease-out'
          }}
        />
      )}

      {/* Spacious Pop-up Window with Adaptive Placement */}
      <div
        className={`copilot-window ${isOpen ? 'open' : ''}`}
        style={{
          position: 'fixed',
          ...windowPlacement,
          background: 'rgba(20, 20, 30, 0.90)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 50px -10px rgba(0,0,0,0.65), 0 0 1px rgba(255,255,255,0.2) inset',
          zIndex: 9998,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: isOpen ? 'scale(1)' : 'scale(0.96)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease'
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #3b82f6', flexShrink: 0 }}>
            <img src="/sagar.jpeg" alt="SAGAR" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=Sagar&background=3b82f6&color=fff'; }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '17px', fontWeight: 600 }}>SAGAR</h3>
              <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.25)', color: '#93C5FD', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>AI</span>
            </div>
            <p style={{ margin: 0, color: '#a0a0a0', fontSize: '11.5px' }}>Drag icon anywhere to reposition</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              type="button"
              onClick={resetToDefault} 
              title="Reset icon position to bottom-right"
              style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px', borderRadius: '6px' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#a0a0a0'}
            >
              <RotateCcw size={15} />
            </button>
            <button 
              type="button"
              onClick={clearChat} 
              style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: '12px', padding: '4px 6px' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#a0a0a0'}
            >
              Clear
            </button>
            <button 
              type="button"
              onClick={toggleCopilot} 
              style={{ background: 'transparent', border: 'none', color: '#a0a0a0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#a0a0a0'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Tier 2: Inside Welcome Hero Card */}
          {messages.length <= 1 && (
            <div style={{
              background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  flexShrink: 0
                }}>
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#FFFFFF' }}>
                    Welcome to Department AI Copilot
                  </h4>
                  <p style={{ margin: '1px 0 0 0', fontSize: '11.5px', color: '#94A3B8' }}>
                    Department of {user?.dept_id?.toUpperCase() || 'CSE'} • Automated Assistant
                  </p>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '12.5px', color: '#CBD5E1', lineHeight: '1.45' }}>
                I can execute administrative actions directly on your dashboard, generate NBA reports, analyze student ratings, or answer system questions.
              </p>

              {/* Status Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', padding: '2px 8px', borderRadius: '5px', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: '600' }}>
                  • System Active
                </span>
                <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.15)', color: '#93C5FD', padding: '2px 8px', borderRadius: '5px', border: '1px solid rgba(59, 130, 246, 0.3)', fontWeight: '600' }}>
                  Voice & Text Supported
                </span>
              </div>

              {/* 1-Click Interactive Action Chips */}
              <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Quick Action Starters
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { label: "Show faculty ratings below 3.0", icon: BarChart3 },
                    { label: "Create a new feedback session", icon: PlusCircle },
                    { label: "Export department consolidated report", icon: FileSpreadsheet },
                    { label: "How do I configure submission dwell timer?", icon: Clock }
                  ].map((chip) => {
                    const IconComp = chip.icon;
                    return (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleSendPrompt(chip.label)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          color: '#F8FAFC',
                          fontSize: '12px',
                          fontWeight: '500',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                          e.currentTarget.style.color = '#FFFFFF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.color = '#F8FAFC';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <IconComp size={14} color="#60A5FA" />
                          <span>{chip.label}</span>
                        </div>
                        <ChevronRight size={13} color="#94A3B8" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
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
