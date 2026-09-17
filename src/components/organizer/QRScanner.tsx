'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, AlertCircle, Users, Scan, Zap, Smartphone, Keyboard } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { motion, AnimatePresence } from 'framer-motion';

interface QRScannerProps {
  eventId: string;
  onCheckIn: (participantId: string, participantData: any) => void;
}

interface ScanResult {
  success: boolean;
  message: string;
  participant?: any;
}

export default function QRScanner({ eventId, onCheckIn }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [scanCount, setScanCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<any>(null);

  const startCamera = async () => {
    try {
      setIsScanning(true);
      setScanResult(null);
      setScannerError(null);

      // Wait a bit for the DOM to update and video element to be available
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!videoRef.current) {
        console.error('Video element not available, trying again...');
        // Try waiting a bit more for the video element to be rendered
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!videoRef.current) {
          throw new Error('Video element not found. Please try again.');
        }
      }

      console.log('🎥 Starting camera and QR scanner...');

      // Dynamically import qr-scanner
      const QrScanner = (await import('qr-scanner')).default;

      // Ensure the video element is properly initialized
      const videoElement = videoRef.current;

      // Create new QR scanner instance
      qrScannerRef.current = new QrScanner(
        videoElement,
        (result) => {
          console.log('🎯 QR Code detected successfully!');
          console.log('QR Code content:', result.data);

          // Process the detected QR code
          processTicketCode(result.data);

          // Stop scanning after successful detection
          stopCamera();
        },
        {
          // Enhanced options for better detection
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // Use back camera on mobile
          maxScansPerSecond: 5, // Increase scan frequency
          calculateScanRegion: (video) => {
            // Define a more focused scan region for better performance
            const smallerDimension = Math.min(video.videoWidth, video.videoHeight);
            const scanRegionSize = Math.round(0.6 * smallerDimension);

            return {
              x: Math.round((video.videoWidth - scanRegionSize) / 2),
              y: Math.round((video.videoHeight - scanRegionSize) / 2),
              width: scanRegionSize,
              height: scanRegionSize,
            };
          },
        }
      );

      // Check if camera is available
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        throw new Error('No camera found on this device.');
      }

      // Start the scanner
      await qrScannerRef.current.start();

      console.log('✅ QR Scanner started successfully');

    } catch (error) {
      console.error('❌ Error starting QR scanner:', error);
      let errorMessage = 'Unable to start QR scanner. ';

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Camera access denied. Please allow camera permissions and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No camera found on this device.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Please check your device permissions and try again.';
      }

      setScannerError(errorMessage);
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
      console.log('📹 QR Scanner stopped');
    }
    setIsScanning(false);
  };

  const processTicketCode = async (qrData: string) => {
    setLoading(true);
    try {
      console.log('Processing QR data:', qrData);

      // The QR data is the ticket code / ticketId stored in Firestore
      const ticketCode = qrData.trim();

      // Call new check-in API (App Router route) expecting { eventId, ticketCode }
      const response = await fetch('/api/tickets/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketCode,
          eventId
        }),
      });

      let result: any = null;
      try {
        result = await response.json();
      } catch (jsonErr) {
        console.error('Failed to parse JSON response from check-in endpoint');
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        setScanResult({
            success: false,
            message: result?.message || result?.error || `Check-in failed (status ${response.status})`
        });
        return;
      }

      if (result.success) {
        const participant = result.participant || {};
        const displayName = participant.memberName || participant.name || 'Participant';
        setScanResult({
          success: true,
          message: `${displayName} checked in successfully!`,
          participant
        });

        setScanCount(prev => prev + 1);

        // Notify parent (use participant.id if present else ticketCode)
        onCheckIn(participant.id || ticketCode, participant);
      } else {
        setScanResult({
          success: false,
          message: result?.message || result?.error || 'Failed to check in participant'
        });
      }
    } catch (error) {
      console.error('Error processing ticket:', error);
      setScanResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error processing ticket. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      processTicketCode(manualCode.trim());
      setManualCode('');
    }
  };

  const clearResult = () => {
    setScanResult(null);
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopCamera();
    };
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto font-[family-name:var(--font-josefin)]">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-sm p-4 sm:p-6 mb-4 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--gold)] opacity-5 rounded-bl-full transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--bg)] border border-[var(--gold)] flex items-center justify-center shadow-[0_0_15px_var(--gold-glow)] mb-1 ml-1 mt-1 mr-1">
              <Scan className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--gold)]" />
            </div>
            <div className="ml-2">
              <h2 className="text-lg sm:text-xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide">Ticket Scanner</h2>
              <p className="text-xs sm:text-sm text-[var(--fg-muted)]">Check in attendees instantly</p>
            </div>
          </div>
          {scanCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-emerald-500/10 border border-emerald-500/30 rounded-sm px-3 py-2"
            >
              <div className="text-emerald-500 font-bold text-lg sm:text-xl font-[family-name:var(--font-marcellus)]">{scanCount}</div>
              <div className="text-emerald-500/70 text-[10px] sm:text-xs uppercase tracking-wider">Checked In</div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-1.5">
        <button
          onClick={() => { setActiveTab('camera'); stopCamera(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-sm font-medium transition-all text-sm sm:text-base uppercase tracking-wider ${
            activeTab === 'camera'
              ? 'bg-[var(--primary)] text-[var(--fg)] shadow-lg'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Scan QR</span>
        </button>
        <button
          onClick={() => { setActiveTab('manual'); stopCamera(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-sm font-medium transition-all text-sm sm:text-base uppercase tracking-wider ${
            activeTab === 'manual'
              ? 'bg-[var(--primary)] text-[var(--fg)] shadow-lg'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          <Keyboard className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Manual</span>
        </button>
      </div>

      {/* Scanner Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'camera' ? (
          <motion.div
            key="camera"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm overflow-hidden"
          >
            {/* Camera View */}
            <div className="relative aspect-square sm:aspect-[4/3]">
              {isScanning ? (
                <div className="relative w-full h-full bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />

                  {/* Scanning Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Dark corners */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />

                    {/* Scan Frame */}
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                      <div className="relative w-full max-w-[200px] sm:max-w-[240px] aspect-square">
                        {/* Animated border */}
                        <div className="absolute inset-0 border-2 border-[var(--gold)]/50" />

                        {/* Corner accents */}
                        <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-[var(--gold)]" />
                        <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-[var(--primary)]" />
                        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-[var(--primary)]" />
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-[var(--gold)]" />

                        {/* Scanning line */}
                        <motion.div
                          className="absolute left-2 right-2 h-0.5 bg-[var(--primary)] shadow-[0_0_10px_var(--primary)]"
                          animate={{ top: ['10%', '90%', '10%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        />

                        {/* Center pulse */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                          <motion.div
                            className="w-3 h-3 bg-[var(--gold)] rounded-full"
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 bg-black/80 backdrop-blur-sm text-[var(--fg)] text-xs sm:text-sm px-4 py-2 rounded-sm border border-[var(--border-subtle)]"
                      >
                        {loading ? (
                          <>
                            <Spinner inline />
                            <span className="uppercase tracking-wider">Processing...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3 text-[var(--gold)]" />
                            <span className="uppercase tracking-wider">Ready to scan</span>
                          </>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[var(--bg-card)]">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-full bg-[var(--bg)] border border-[var(--gold)] flex items-center justify-center shadow-[0_0_15px_var(--gold-glow)]">
                      <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--gold)]" />
                    </div>
                    <div className="mt-8">
                       <h3 className="text-[var(--fg)] font-bold text-base sm:text-lg mb-2 font-[family-name:var(--font-marcellus)] uppercase tracking-wide">Camera Ready</h3>
                       <p className="text-[var(--fg-muted)] text-xs sm:text-sm mb-4">Tap the button below to start scanning</p>
                    </div>

                    {scannerError && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-3 bg-red-900/10 border border-red-800/30 rounded-sm"
                      >
                        <p className="text-red-400 text-xs sm:text-sm">{scannerError}</p>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              )}
            </div>

            {/* Camera Control Button */}
            <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border-subtle)]">
              {!isScanning ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startCamera}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-[var(--fg)] rounded-sm font-bold text-sm sm:text-base shadow-lg shadow-[var(--primary-glow)] transition-all uppercase tracking-wider border border-[var(--primary-light)]"
                >
                  <Camera className="w-5 h-5" />
                  Start Scanning
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={stopCamera}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-red-900/50 hover:bg-red-900/80 text-red-100 rounded-sm font-bold text-sm sm:text-base transition-all uppercase tracking-wider border border-red-800"
                >
                  <XCircle className="w-5 h-5" />
                  Stop Scanner
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="manual"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-4 sm:p-6"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full bg-[var(--bg)] border border-[var(--primary)] flex items-center justify-center shadow-[0_0_15px_var(--primary-glow)]">
                <Users className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--primary)]" />
              </div>
              <div className="mt-8">
                <h3 className="text-[var(--fg)] font-bold text-base sm:text-lg mb-1 font-[family-name:var(--font-marcellus)] uppercase tracking-wide">Manual Check-in</h3>
                <p className="text-[var(--fg-muted)] text-xs sm:text-sm">Enter ticket code, email, or name</p>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ticket code, email, or name..."
                  className="w-full px-4 py-4 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)] text-sm sm:text-base transition-all"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || !manualCode.trim()}
                className="w-full flex items-center justify-center gap-3 py-4 bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--fg)] rounded-sm font-bold text-sm sm:text-base shadow-lg shadow-[var(--primary-glow)] transition-all uppercase tracking-wider border border-[var(--primary-light)]"
              >
                {loading ? (
                  <>
                    <Spinner inline />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Check In
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan Result Toast */}
      <AnimatePresence>
        {scanResult && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 ${
              scanResult.success
                ? 'bg-emerald-950/95 border-emerald-500/30'
                : 'bg-red-950/95 border-red-500/30'
            } backdrop-blur-xl border rounded-sm p-4 shadow-2xl`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mt-1 ml-1 transform border ${
                scanResult.success ? 'bg-emerald-900 border-emerald-500/50' : 'bg-red-900 border-red-500/50'
              }`}>
                {scanResult.success ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
              </div>

              <div className="flex-1 min-w-0 ml-3">
                <h4 className={`font-bold text-sm sm:text-base font-[family-name:var(--font-marcellus)] uppercase tracking-wide ${
                  scanResult.success ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {scanResult.success ? 'Check-in Successful' : 'Check-in Failed'}
                </h4>
                <p className={`text-xs sm:text-sm mt-1 ${
                  scanResult.success ? 'text-emerald-400/80' : 'text-red-400/80'
                }`}>
                  {scanResult.message}
                </p>

                {scanResult.success && scanResult.participant && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                    {scanResult.participant.teamName && (
                      <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
                        <span className="text-[var(--fg-muted)]">Team:</span>
                        <span className="font-medium text-[var(--fg)]">{scanResult.participant.teamName}</span>
                      </div>
                    )}
                    {(scanResult.participant.memberName || scanResult.participant.member1Name || scanResult.participant.name) && (
                      <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
                        <span className="text-[var(--fg-muted)]">Name:</span>
                        <span className="font-medium text-[var(--fg)]">{scanResult.participant.memberName || scanResult.participant.member1Name || scanResult.participant.name}</span>
                      </div>
                    )}
                    {(scanResult.participant.memberEmail || scanResult.participant.member1Email || scanResult.participant.email) && (
                      <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
                        <span className="text-[var(--fg-muted)]">Email:</span>
                        <span className="font-medium text-[var(--fg)] truncate">{scanResult.participant.memberEmail || scanResult.participant.member1Email || scanResult.participant.email}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={clearResult}
                className="flex-shrink-0 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Auto-dismiss progress */}
            <motion.div
              className={`absolute bottom-0 left-0 h-1 ${
                scanResult.success ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
              onAnimationComplete={clearResult}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
