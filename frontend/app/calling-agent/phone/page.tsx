"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PostCallModal from "@/components/modals/PostCallModal";
import { Phone, PhoneOff, Delete, Settings } from "lucide-react";
import { useJsSIP, SIPConfig } from "@/hooks/useJsSIP";

export default function PhonePage() {
  const [number, setNumber] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [showPostCallModal, setShowPostCallModal] = useState(false);
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<SIPConfig>({
    wssUrl: "",
    extension: "",
    password: "",
  });

  const {
    status,
    callState,
    incomingNumber,
    register,
    unregister,
    makeCall,
    answerCall,
    hangupCall,
    remoteAudioRef,
  } = useJsSIP();

  // Load saved config on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem("sip_config");
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setConfig(parsed);
      register(parsed);
    }
  }, [register]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === "active") {
      interval = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Update dialer when incoming call arrives
  useEffect(() => {
    if (incomingNumber && callState === "ringing") {
      setNumber(incomingNumber);
    }
  }, [incomingNumber, callState]);

  // Trigger post-call modal on hangup if it was an active call
  // We need to know if the call was active before it ended. 
  // Let's use a ref or effect based on duration.
  const [wasActive, setWasActive] = useState(false);
  useEffect(() => {
    if (callState === "active") setWasActive(true);
    if (callState === "idle" && wasActive) {
      setShowPostCallModal(true);
      setWasActive(false);
    }
  }, [callState, wasActive]);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("sip_config", JSON.stringify(config));
    setShowSettings(false);
    register(config);
  };

  const handleDial = (digit: string) => {
    if (callState === "idle") {
      setNumber((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (callState === "idle") {
      setNumber((prev) => prev.slice(0, -1));
    }
  };

  const initiateCall = () => {
    if (!number) return;
    makeCall(number);
  };

  const handleHangup = () => {
    hangupCall();
    // If it wasn't active (e.g. cancelled before answer), we reset manually
    if (callState !== "active") {
      setNumber("");
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <AppLayout title="Phone Softphone" subtitle="Make and receive calls directly via 3CX WebRTC.">
      
      {/* Hidden audio element for WebRTC remote stream */}
      <audio ref={remoteAudioRef} autoPlay />

      <div className="flex justify-center items-center py-10 relative">
        <div className="glass w-[360px] rounded-[40px] p-8 shadow-card flex flex-col items-center relative overflow-hidden">
          
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="absolute top-6 right-6 text-muted hover:text-primary transition-colors"
          >
            <Settings size={20} />
          </button>

          {/* Status Bar */}
          <div className="w-full flex justify-center mb-8">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
              status === 'registered' && callState === 'idle' ? 'bg-emerald/20 text-emerald' :
              status === 'registration_failed' ? 'bg-rose/20 text-rose' :
              callState === 'ringing' ? 'bg-amber/20 text-amber animate-pulse' :
              callState === 'active' ? 'bg-emerald text-white animate-pulse' :
              'bg-white/5 text-muted'
            }`}>
              {callState === 'idle' 
                ? (status === 'registered' ? 'Registered & Ready' : status.replace('_', ' '))
                : callState === 'ringing' ? 'Ringing...' : 'In Call'}
            </span>
          </div>

          {/* Number Display */}
          <div className="w-full h-16 flex items-center justify-center relative mb-8">
            <h1 className="text-3xl font-mono text-primary font-bold tracking-wider truncate px-6 text-center w-full">
              {number || "—"}
            </h1>
            {number && callState === "idle" && (
              <button 
                onClick={handleBackspace}
                className="absolute right-0 text-muted hover:text-rose p-2 transition-colors"
              >
                <Delete size={20} />
              </button>
            )}
          </div>

          {/* Active Call Duration */}
          {callState === "active" && (
            <div className="text-4xl font-mono text-gold font-bold mb-8 animate-fade-in">
              {formatDuration(callDuration)}
            </div>
          )}

          {/* Keypad */}
          {callState === "idle" && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {['1','2','3','4','5','6','7','8','9','*','0','#'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleDial(digit)}
                  className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all duration-200 flex items-center justify-center text-xl font-bold font-outfit"
                >
                  {digit}
                </button>
              ))}
            </div>
          )}

          {/* Call Controls */}
          <div className="flex gap-6 w-full justify-center">
            {callState === "idle" && (
              <button
                onClick={initiateCall}
                disabled={!number || status !== 'registered'}
                className="w-16 h-16 rounded-full bg-emerald hover:bg-emerald-bright disabled:opacity-50 disabled:hover:bg-emerald shadow-glow-emerald transition-all duration-200 flex items-center justify-center text-white active:scale-95"
              >
                <Phone size={24} fill="currentColor" />
              </button>
            )}
            
            {callState === "ringing" && (
              <button
                onClick={answerCall}
                className="w-16 h-16 rounded-full bg-emerald hover:bg-emerald-bright shadow-glow-emerald transition-all duration-200 flex items-center justify-center text-white active:scale-95 animate-bounce"
              >
                <Phone size={24} fill="currentColor" />
              </button>
            )}

            {callState !== "idle" && (
              <button
                onClick={handleHangup}
                className="w-16 h-16 rounded-full bg-rose hover:bg-rose-bright shadow-glow-rose transition-all duration-200 flex items-center justify-center text-white active:scale-95"
              >
                <PhoneOff size={24} />
              </button>
            )}
          </div>
        </div>

        {/* SIP Settings Panel */}
        {showSettings && (
          <div className="absolute right-0 top-10 w-80 glass rounded-2xl p-6 shadow-xl border border-white/10 z-50 animate-fade-in">
            <h3 className="text-lg font-bold text-primary mb-4">3CX WebRTC Settings</h3>
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs text-muted mb-1">WSS URL</label>
                <input 
                  type="text" 
                  required
                  placeholder="wss://your-pbx.3cx.us:5001/bps/webrtc"
                  className="input w-full"
                  value={config.wssUrl}
                  onChange={(e) => setConfig({...config, wssUrl: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Extension</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 101"
                  className="input w-full"
                  value={config.extension}
                  onChange={(e) => setConfig({...config, extension: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">WebRTC Password</label>
                <input 
                  type="password" 
                  required
                  className="input w-full"
                  value={config.password}
                  onChange={(e) => setConfig({...config, password: e.target.value})}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 btn-primary py-2 text-sm rounded-lg">Save & Connect</button>
                <button type="button" onClick={() => setShowSettings(false)} className="flex-1 py-2 text-sm text-muted hover:text-white border border-white/10 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {showPostCallModal && (
        <PostCallModal 
          callNumber={number}
          callDuration={callDuration}
          onClose={() => {
            setShowPostCallModal(false);
            setNumber("");
          }}
          onSuccess={() => {
            setShowPostCallModal(false);
            setNumber("");
          }}
        />
      )}
    </AppLayout>
  );
}
