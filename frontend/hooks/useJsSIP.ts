import { useState, useEffect, useRef, useCallback } from 'react';
import JsSIP from 'jssip';

export interface SIPConfig {
  wssUrl: string;
  extension: string;
  password: string;
}

export function useJsSIP() {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'registered' | 'registration_failed'>('disconnected');
  const [callState, setCallState] = useState<'idle' | 'ringing' | 'active'>('idle');
  const [incomingNumber, setIncomingNumber] = useState<string | null>(null);
  
  const uaRef = useRef<JsSIP.UA | null>(null);
  const sessionRef = useRef<any | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const register = useCallback((config: SIPConfig) => {
    if (!config.wssUrl || !config.extension || !config.password) return;
    
    // Extract domain from WSS URL if possible
    let domain = config.wssUrl.replace('wss://', '').replace('ws://', '').split(':')[0];
    if (domain.includes('/')) domain = domain.split('/')[0];
    
    const uri = `sip:${config.extension}@${domain}`;
    
    const socket = new JsSIP.WebSocketInterface(config.wssUrl);
    const configuration = {
      sockets: [socket],
      uri: uri,
      password: config.password,
      register: true,
      session_timers: false,
    };

    if (uaRef.current) {
      uaRef.current.stop();
    }

    const ua = new JsSIP.UA(configuration);
    uaRef.current = ua;

    ua.on('connecting', () => setStatus('connecting'));
    ua.on('connected', () => setStatus('connected'));
    ua.on('disconnected', () => setStatus('disconnected'));
    ua.on('registered', () => setStatus('registered'));
    ua.on('registrationFailed', () => setStatus('registration_failed'));

    ua.on('newRTCSession', (data) => {
      const { session, originator } = data;
      
      if (sessionRef.current && sessionRef.current !== session) {
        // Already in a call
        session.terminate();
        return;
      }

      sessionRef.current = session;

      if (originator === 'remote') {
        setIncomingNumber(session.remote_identity.uri.user);
        setCallState('ringing');
      }

      session.on('progress', () => {
        if (originator === 'local') setCallState('ringing');
      });

      session.on('confirmed', () => {
        setCallState('active');
        
        // Setup remote audio
        const connection = session.connection;
        if (connection) {
          connection.addEventListener('track', (e) => {
            if (remoteAudioRef.current && e.streams[0]) {
              remoteAudioRef.current.srcObject = e.streams[0];
              remoteAudioRef.current.play().catch(console.error);
            }
          });
        }
      });

      session.on('ended', () => handleCallEnd());
      session.on('failed', () => handleCallEnd());
    });

    ua.start();
  }, []);

  const unregister = useCallback(() => {
    if (uaRef.current) {
      uaRef.current.stop();
      uaRef.current = null;
    }
    setStatus('disconnected');
    handleCallEnd();
  }, []);

  const handleCallEnd = () => {
    setCallState('idle');
    setIncomingNumber(null);
    sessionRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  };

  const makeCall = useCallback((targetNumber: string) => {
    if (!uaRef.current || !targetNumber) return;
    const options = {
      mediaConstraints: { audio: true, video: false }
    };
    uaRef.current.call(targetNumber.toString(), options);
  }, []);

  const answerCall = useCallback(() => {
    if (sessionRef.current && callState === 'ringing') {
      const options = {
        mediaConstraints: { audio: true, video: false }
      };
      sessionRef.current.answer(options);
    }
  }, [callState]);

  const hangupCall = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.terminate();
    } else {
      handleCallEnd();
    }
  }, []);

  return {
    status,
    callState,
    incomingNumber,
    register,
    unregister,
    makeCall,
    answerCall,
    hangupCall,
    localAudioRef,
    remoteAudioRef,
  };
}
