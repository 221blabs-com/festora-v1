'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Scan,
  Zap,
  Smartphone,
  Keyboard,
  Ticket as TicketIcon,
  Tag,
  Calendar,
  Clock,
  UserCheck,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { motion, AnimatePresence } from 'framer-motion';

export interface QRScannerProps {
  eventId: string;
  onCheckIn?: (participantId: string, participantData: any) => void;
  initialMode?: 'ticket' | 'dynamic_qr';
  eventDays?: Array<{ dayNumber: number; date: string; title?: string }>;
}

export type ScanCategory = 'ticket' | 'dynamic_qr';

export interface DynamicQrPassDetail {
  id: string;
  eventId: string;
  eventTitle?: string;
  registrationId?: string;
  ticketId?: string;
  participantId?: string;
  participantName?: string;
  participantEmail?: string;
  participantPhone?: string;
  fieldName?: string;
  qrName?: string;
  qrDescription?: string;
  code: string;
  validDayNumber?: number | 'all';
  status: 'active' | 'redeemed' | 'cancelled';
  emailStatus?: string;
  redeemedAt?: string;
  redeemedBy?: string;
  createdAt?: string;
}

export interface DynamicQrScanState {
  code: string;
  status: 'VALID' | 'REDEEMED' | 'ALREADY REDEEMED' | 'INVALID QR' | 'INVALID FOR TODAY' | 'INVALID REGISTRATION';
  message: string;
  pass?: DynamicQrPassDetail;
}

export interface TicketScanState {
  success: boolean;
  status: 'VALID' | 'ALREADY CHECKED IN' | 'INVALID QR' | 'INVALID FOR TODAY' | 'INVALID TICKET';
  message: string;
  dayNumber?: number;
  checkInTime?: string;
  participant?: {
    id?: string;
    ticketId?: string;
    orderId?: string;
    name?: string;
    memberName?: string;
    memberEmail?: string;
    memberPhone?: string;
    teamName?: string;
    checkedIn?: boolean;
    checkedInAt?: string;
    dayNumber?: number;
    [key: string]: any;
  };
}

export default function QRScanner({
  eventId,
  onCheckIn,
  initialMode = 'ticket',
  eventDays
}: QRScannerProps) {
  const [scanCategory, setScanCategory] = useState<ScanCategory>(initialMode);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [scanCount, setScanCount] = useState(0);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | 'auto'>('auto');

  // Results
  const [ticketResult, setTicketResult] = useState<TicketScanState | null>(null);
  const [dynamicQrResult, setDynamicQrResult] = useState<DynamicQrScanState | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<any>(null);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (qrScannerRef.current) {
      try {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      } catch (err) {
        console.error('Error stopping QR scanner:', err);
      }
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Handle Dynamic QR redemption action
  const handleRedeemDynamicQr = async (code: string) => {
    setIsRedeeming(true);
    try {
      const response = await fetch('/api/dynamic-qr/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          eventId,
          action: 'redeem',
          staffInfo: { name: 'Staff Scanner' },
          currentDayNumber: selectedDayNumber === 'auto' ? undefined : selectedDayNumber
        })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setDynamicQrResult({
          code,
          status: 'REDEEMED',
          message: result.message || 'Coupon redeemed successfully!',
          pass: result.pass || {
            ...(dynamicQrResult?.pass as any),
            status: 'redeemed',
            redeemedAt: new Date().toISOString(),
            redeemedBy: 'Staff Scanner'
          }
        });
        setScanCount(prev => prev + 1);
      } else {
        setDynamicQrResult({
          code,
          status: result.status || 'INVALID QR',
          message: result.message || 'Failed to redeem coupon',
          pass: result.pass || dynamicQrResult?.pass
        });
      }
    } catch (err: any) {
      console.error('Redemption error:', err);
      setDynamicQrResult(prev => prev ? {
        ...prev,
        status: 'INVALID QR',
        message: err?.message || 'Server error during redemption'
      } : null);
    } finally {
      setIsRedeeming(false);
    }
  };

  // Main QR process handler
  const processScannedCode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    setLoading(true);
    setTicketResult(null);
    setDynamicQrResult(null);

    try {
      // Determine if code is likely a dynamic QR
      const isLikelyDynamicQr =
        scanCategory === 'dynamic_qr' ||
        code.startsWith('DQR_') ||
        /^[A-Z]{2,4}-[A-Z0-9]{4,8}$/i.test(code);

      if (isLikelyDynamicQr) {
        // Validate with dynamic QR endpoint first
        const response = await fetch('/api/dynamic-qr/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            eventId,
            action: 'validate',
            currentDayNumber: selectedDayNumber === 'auto' ? undefined : selectedDayNumber
          })
        });

        const result = await response.json();

        // If found or error specifically from dynamic QR validation
        if (result.pass || result.status !== 'INVALID QR' || scanCategory === 'dynamic_qr') {
          setDynamicQrResult({
            code,
            status: result.status || (result.success ? 'VALID' : 'INVALID QR'),
            message: result.message || 'Processed dynamic QR',
            pass: result.pass
          });
          setScanCategory('dynamic_qr');
          return;
        }
      }

      // Check-in as ticket
      const response = await fetch('/api/tickets/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketCode: code,
          eventId,
          dayNumber: selectedDayNumber === 'auto' ? undefined : selectedDayNumber
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const participant = result.participant || {};
        const displayName = participant.memberName || participant.name || 'Participant';
        setTicketResult({
          success: true,
          status: 'VALID',
          message: `${displayName} checked in successfully!`,
          dayNumber: result.dayNumber,
          checkInTime: new Date().toLocaleTimeString(),
          participant
        });
        setScanCount(prev => prev + 1);
        if (onCheckIn) {
          onCheckIn(participant.id || code, participant);
        }
        setScanCategory('ticket');
      } else {
        // Map message to status
        let status: TicketScanState['status'] = 'INVALID QR';
        const msg = result?.message || result?.error || 'Check-in failed';
        if (msg.toLowerCase().includes('already checked in')) {
          status = 'ALREADY CHECKED IN';
        } else if (msg.toLowerCase().includes('valid only for day')) {
          status = 'INVALID FOR TODAY';
        } else if (msg.toLowerCase().includes('cancelled') || msg.toLowerCase().includes('refunded')) {
          status = 'INVALID TICKET';
        }

        // Check if dynamic QR validation might match if not in strict mode
        if (status === 'INVALID QR' && scanCategory === 'ticket') {
          const dqrResponse = await fetch('/api/dynamic-qr/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              eventId,
              action: 'validate',
              currentDayNumber: selectedDayNumber === 'auto' ? undefined : selectedDayNumber
            })
          });
          const dqrResult = await dqrResponse.json();
          if (dqrResult.pass) {
            setDynamicQrResult({
              code,
              status: dqrResult.status || (dqrResult.success ? 'VALID' : 'INVALID QR'),
              message: dqrResult.message,
              pass: dqrResult.pass
            });
            setScanCategory('dynamic_qr');
            return;
          }
        }

        setTicketResult({
          success: false,
          status,
          message: msg,
          participant: result?.participant
        });
        setScanCategory('ticket');
      }
    } catch (err: any) {
      console.error('Error processing scanned code:', err);
      setTicketResult({
        success: false,
        status: 'INVALID QR',
        message: err?.message || 'Error processing scan. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setIsScanning(true);
      setTicketResult(null);
      setDynamicQrResult(null);
      setScannerError(null);

      await new Promise(resolve => setTimeout(resolve, 150));

      if (!videoRef.current) {
        await new Promise(resolve => setTimeout(resolve, 400));
        if (!videoRef.current) {
          throw new Error('Camera video element not found.');
        }
      }

      const QrScanner = (await import('qr-scanner')).default;
      const videoElement = videoRef.current;

      qrScannerRef.current = new QrScanner(
        videoElement,
        (result: any) => {
          stopCamera();
          processScannedCode(result.data);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment',
          maxScansPerSecond: 6,
          calculateScanRegion: (video: any) => {
            const smallerDimension = Math.min(video.videoWidth, video.videoHeight);
            const scanRegionSize = Math.round(0.65 * smallerDimension);
            return {
              x: Math.round((video.videoWidth - scanRegionSize) / 2),
              y: Math.round((video.videoHeight - scanRegionSize) / 2),
              width: scanRegionSize,
              height: scanRegionSize,
            };
          },
        }
      );

      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        throw new Error('No camera found on this device.');
      }

      await qrScannerRef.current.start();
    } catch (error: any) {
      console.error('Error starting QR scanner:', error);
      let errorMessage = 'Unable to start camera. ';
      if (error?.name === 'NotAllowedError') {
        errorMessage += 'Camera access denied. Please grant camera permission.';
      } else if (error?.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else {
        errorMessage += error?.message || 'Please check device permissions.';
      }
      setScannerError(errorMessage);
      setIsScanning(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      processScannedCode(manualCode.trim());
      setManualCode('');
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="w-full max-w-xl mx-auto font-[family-name:var(--font-josefin)]">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-sm p-4 sm:p-5 mb-4 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-20 h-20 bg-[var(--gold)] opacity-5 rounded-bl-full transform translate-x-1/2 -translate-y-1/2" />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--bg)] border border-[var(--gold)] flex items-center justify-center shadow-[0_0_15px_var(--gold-glow)]">
              <Scan className="w-6 h-6 text-[var(--gold)]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
                Festora Scanner
              </h2>
              <p className="text-xs text-[var(--fg-muted)]">Entry passes & dynamic coupon redemption</p>
            </div>
          </div>
          {scanCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-emerald-500/10 border border-emerald-500/30 rounded-sm px-3 py-1.5 text-center"
            >
              <div className="text-emerald-400 font-bold text-lg font-[family-name:var(--font-marcellus)]">{scanCount}</div>
              <div className="text-emerald-400/80 text-[10px] uppercase tracking-wider">Processed</div>
            </motion.div>
          )}
        </div>

        {/* Scan Category Mode Switcher */}
        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-1.5 p-1 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-xs">
            <button
              onClick={() => { setScanCategory('ticket'); setTicketResult(null); setDynamicQrResult(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-semibold uppercase tracking-wider transition-all ${
                scanCategory === 'ticket'
                  ? 'bg-[var(--primary)] text-white shadow-sm'
                  : 'text-[var(--fg-muted)] hover:text-white'
              }`}
            >
              <TicketIcon className="w-3.5 h-3.5" />
              <span>Event Entry Pass</span>
            </button>
            <button
              onClick={() => { setScanCategory('dynamic_qr'); setTicketResult(null); setDynamicQrResult(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-semibold uppercase tracking-wider transition-all ${
                scanCategory === 'dynamic_qr'
                  ? 'bg-[var(--gold)] text-black font-bold shadow-sm'
                  : 'text-[var(--fg-muted)] hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Dynamic QR / Coupon</span>
            </button>
          </div>

          {/* Multi-day Selector */}
          {eventDays && eventDays.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-[var(--gold)]" />
              <select
                value={selectedDayNumber}
                onChange={(e) => setSelectedDayNumber(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
                className="bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)] px-2.5 py-1 rounded-sm text-xs focus:border-[var(--gold)] outline-none"
              >
                <option value="auto">Auto-detect Day</option>
                {eventDays.map(d => (
                  <option key={d.dayNumber} value={d.dayNumber}>
                    Day {d.dayNumber} ({d.date})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </motion.div>

      {/* Input Method Switcher (Camera vs Manual) */}
      <div className="flex gap-2 mb-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-1.5">
        <button
          onClick={() => { setActiveTab('camera'); stopCamera(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-sm font-medium transition-all text-xs sm:text-sm uppercase tracking-wider ${
            activeTab === 'camera'
              ? 'bg-[var(--primary)] text-[var(--fg)] shadow-lg'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Camera Scanner</span>
        </button>
        <button
          onClick={() => { setActiveTab('manual'); stopCamera(); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-sm font-medium transition-all text-xs sm:text-sm uppercase tracking-wider ${
            activeTab === 'manual'
              ? 'bg-[var(--primary)] text-[var(--fg)] shadow-lg'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card-hover)]'
          }`}
        >
          <Keyboard className="w-4 h-4" />
          <span>Manual Input</span>
        </button>
      </div>

      {/* Camera / Manual Input View */}
      <AnimatePresence mode="wait">
        {activeTab === 'camera' ? (
          <motion.div
            key="camera"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm overflow-hidden mb-4"
          >
            <div className="relative aspect-square sm:aspect-[4/3] bg-black">
              {isScanning ? (
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />
                    <div className="absolute inset-0 flex items-center justify-center p-8">
                      <div className="relative w-full max-w-[220px] aspect-square">
                        <div className="absolute inset-0 border-2 border-[var(--gold)]/50" />
                        <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-[var(--gold)]" />
                        <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-[var(--primary)]" />
                        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-[var(--primary)]" />
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-[var(--gold)]" />

                        <motion.div
                          className="absolute left-2 right-2 h-0.5 bg-[var(--gold)] shadow-[0_0_12px_var(--gold)]"
                          animate={{ top: ['10%', '90%', '10%'] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      </div>
                    </div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                      <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm text-[var(--fg)] text-xs px-3.5 py-1.5 rounded-sm border border-[var(--border-subtle)]">
                        {loading ? (
                          <>
                            <Spinner inline />
                            <span className="uppercase tracking-wider">Verifying with backend...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-[var(--gold)]" />
                            <span className="uppercase tracking-wider">
                              Scanning {scanCategory === 'dynamic_qr' ? 'Dynamic QR' : 'Pass'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[var(--bg-card)]">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 rounded-full bg-[var(--bg)] border border-[var(--gold)] flex items-center justify-center shadow-[0_0_15px_var(--gold-glow)]">
                    <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-[var(--gold)]" />
                  </div>
                  <h3 className="text-[var(--fg)] font-bold text-sm sm:text-base font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
                    Ready to Scan
                  </h3>
                  <p className="text-[var(--fg-muted)] text-xs mt-1 text-center max-w-xs">
                    Hold participant QR code steadily in front of the lens.
                  </p>
                  {scannerError && (
                    <div className="mt-3 p-2.5 bg-red-950/40 border border-red-800/40 rounded-sm text-red-400 text-xs text-center max-w-xs">
                      {scannerError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-3 bg-[var(--bg-card)] border-t border-[var(--border-subtle)]">
              {!isScanning ? (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={startCamera}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-[var(--fg)] rounded-sm font-bold text-xs sm:text-sm uppercase tracking-wider shadow-md border border-[var(--primary-light)]"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera Scanner</span>
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={stopCamera}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-950/70 hover:bg-red-900 text-red-200 rounded-sm font-bold text-xs sm:text-sm uppercase tracking-wider border border-red-800/60"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Stop Scanner</span>
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="manual"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-4 sm:p-5 mb-4"
          >
            <div className="text-center mb-4">
              <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-[var(--bg)] border border-[var(--gold)] flex items-center justify-center shadow-[0_0_15px_var(--gold-glow)]">
                <Users className="w-6 h-6 text-[var(--gold)]" />
              </div>
              <h3 className="text-[var(--fg)] font-bold text-sm sm:text-base font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
                Manual Code Entry
              </h3>
              <p className="text-[var(--fg-muted)] text-xs">
                Enter ticket code, coupon code (e.g. FC-8A72K), or pass ID
              </p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={scanCategory === 'dynamic_qr' ? "e.g. FC-8A72K or DQR_..." : "e.g. TF4821 or TF4821-D1"}
                className="w-full px-4 py-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm text-[var(--fg)] placeholder-[var(--fg-muted)] focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)] text-sm transition-all"
              />
              <button
                type="submit"
                disabled={loading || !manualCode.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 text-[var(--fg)] rounded-sm font-bold text-xs sm:text-sm uppercase tracking-wider border border-[var(--primary-light)]"
              >
                {loading ? <Spinner inline /> : <CheckCircle className="w-4 h-4" />}
                <span>Verify & Process</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DYNAMIC QR COUPON RESULT CARD */}
      <AnimatePresence>
        {dynamicQrResult && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className={`rounded-sm border p-4 sm:p-5 mb-4 shadow-xl ${
              dynamicQrResult.status === 'VALID'
                ? 'bg-emerald-950/40 border-emerald-500/40'
                : dynamicQrResult.status === 'REDEEMED'
                ? 'bg-blue-950/40 border-blue-500/40'
                : dynamicQrResult.status === 'ALREADY REDEEMED'
                ? 'bg-amber-950/40 border-amber-500/40'
                : 'bg-red-950/40 border-red-500/40'
            }`}
          >
            {/* Header Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                {dynamicQrResult.status === 'VALID' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {dynamicQrResult.status === 'REDEEMED' && <CheckCircle className="w-5 h-5 text-blue-400" />}
                {dynamicQrResult.status === 'ALREADY REDEEMED' && <AlertCircle className="w-5 h-5 text-amber-400" />}
                {(dynamicQrResult.status === 'INVALID QR' || dynamicQrResult.status === 'INVALID FOR TODAY' || dynamicQrResult.status === 'INVALID REGISTRATION') && (
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                )}
                <span className={`text-base font-bold font-[family-name:var(--font-marcellus)] uppercase tracking-wide ${
                  dynamicQrResult.status === 'VALID'
                    ? 'text-emerald-400'
                    : dynamicQrResult.status === 'REDEEMED'
                    ? 'text-blue-400'
                    : dynamicQrResult.status === 'ALREADY REDEEMED'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}>
                  {dynamicQrResult.status}
                </span>
              </div>
              <button
                onClick={() => setDynamicQrResult(null)}
                className="text-gray-400 hover:text-white text-xs uppercase"
              >
                Clear
              </button>
            </div>

            <p className="text-xs text-[var(--fg-muted)] mb-4">{dynamicQrResult.message}</p>

            {/* Dynamic QR Fields Breakdown */}
            {dynamicQrResult.pass && (
              <div className="grid grid-cols-2 gap-2.5 text-xs bg-[var(--bg)]/60 border border-white/5 rounded-sm p-3.5 mb-4">
                <div>
                  <span className="text-[var(--fg-muted)] block text-[10px] uppercase tracking-wider">Participant Name</span>
                  <span className="font-semibold text-white text-sm">{dynamicQrResult.pass.participantName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[var(--fg-muted)] block text-[10px] uppercase tracking-wider">Coupon / Pass</span>
                  <span className="font-bold text-[var(--gold)] text-sm">{dynamicQrResult.pass.qrName || dynamicQrResult.pass.fieldName}</span>
                </div>
                <div>
                  <span className="text-[var(--fg-muted)] block text-[10px] uppercase tracking-wider">Event</span>
                  <span className="text-white truncate block">{dynamicQrResult.pass.eventTitle || eventId}</span>
                </div>
                <div>
                  <span className="text-[var(--fg-muted)] block text-[10px] uppercase tracking-wider">QR Type</span>
                  <span className="text-white">{dynamicQrResult.pass.fieldName || 'Dynamic QR'}</span>
                </div>
                <div>
                  <span className="text-[var(--fg-muted)] block text-[10px] uppercase tracking-wider">Registration ID</span>
                  <span className="font-mono text-gray-300 truncate block">{dynamicQrResult.pass.registrationId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[var(--fg-muted)] block text-[10px] uppercase tracking-wider">Ticket ID</span>
                  <span className="font-mono text-gray-300 truncate block">{dynamicQrResult.pass.ticketId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[var(--fg-muted)] block text-[10px] uppercase tracking-wider">Valid Date / Day</span>
                  <span className="text-white">
                    {dynamicQrResult.pass.validDayNumber && dynamicQrResult.pass.validDayNumber !== 'all'
                      ? `Day ${dynamicQrResult.pass.validDayNumber}`
                      : 'Entire Event'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--fg-muted)] block text-[10px] uppercase tracking-wider">Pass Code</span>
                  <span className="font-mono text-[var(--gold)] font-bold">{dynamicQrResult.pass.code}</span>
                </div>

                {/* Redemption timestamp if redeemed */}
                {(dynamicQrResult.pass.redeemedAt || dynamicQrResult.status === 'REDEEMED' || dynamicQrResult.status === 'ALREADY REDEEMED') && (
                  <div className="col-span-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[var(--fg-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      Redeemed At: {dynamicQrResult.pass.redeemedAt ? new Date(dynamicQrResult.pass.redeemedAt).toLocaleString() : 'Just now'}
                    </span>
                    {dynamicQrResult.pass.redeemedBy && (
                      <span>By: {dynamicQrResult.pass.redeemedBy}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Redeem Action Button (When Unused & Valid) */}
            {dynamicQrResult.status === 'VALID' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleRedeemDynamicQr(dynamicQrResult.code)}
                disabled={isRedeeming}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-sm uppercase tracking-wider shadow-lg shadow-emerald-950 text-sm border border-emerald-400"
              >
                {isRedeeming ? (
                  <>
                    <Spinner inline />
                    <span>Redeeming...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>REDEEM</span>
                  </>
                )}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* EVENT TICKET CHECK-IN RESULT CARD */}
      <AnimatePresence>
        {ticketResult && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className={`rounded-sm border p-4 sm:p-5 mb-4 shadow-xl ${
              ticketResult.status === 'VALID'
                ? 'bg-emerald-950/40 border-emerald-500/40'
                : ticketResult.status === 'ALREADY CHECKED IN'
                ? 'bg-amber-950/40 border-amber-500/40'
                : 'bg-red-950/40 border-red-500/40'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                {ticketResult.status === 'VALID' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                {ticketResult.status === 'ALREADY CHECKED IN' && <AlertCircle className="w-5 h-5 text-amber-400" />}
                {(ticketResult.status === 'INVALID QR' || ticketResult.status === 'INVALID FOR TODAY' || ticketResult.status === 'INVALID TICKET') && (
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                )}
                <span className={`text-base font-bold font-[family-name:var(--font-marcellus)] uppercase tracking-wide ${
                  ticketResult.status === 'VALID'
                    ? 'text-emerald-400'
                    : ticketResult.status === 'ALREADY CHECKED IN'
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}>
                  {ticketResult.status}
                </span>
              </div>
              <button
                onClick={() => setTicketResult(null)}
                className="text-gray-400 hover:text-white text-xs uppercase"
              >
                Clear
              </button>
            </div>

            <p className="text-xs text-[var(--fg-muted)] mb-4">{ticketResult.message}</p>

            {/* Ticket & Participant Details */}
            {ticketResult.participant && (
              <div className="grid grid-cols-2 gap-2.5 text-xs bg-[var(--bg)]/60 border border-white/5 rounded-sm p-3.5 mb-2">
                <div>
                  <span className="text-[var(--fg-muted)] block text-[10px] uppercase tracking-wider">Participant Name</span>
                  <span className="font-semibold text-white text-sm">
                    {ticketResult.participant.memberName || ticketResult.participant.name || 'Participant'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--fg-muted)] block text-[10px] uppercase tracking-wider">Check-in Status</span>
                  <span className={`font-semibold ${ticketResult.status === 'VALID' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {ticketResult.status === 'VALID' ? 'Checked In' : ticketResult.status}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--fg-muted)] block text-[10px] uppercase tracking-wider">Ticket ID</span>
                  <span className="font-mono text-gray-300 truncate block">
                    {ticketResult.participant.ticketId || ticketResult.participant.id || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--fg-muted)] block text-[10px] uppercase tracking-wider">Registration / Order ID</span>
                  <span className="font-mono text-gray-300 truncate block">
                    {ticketResult.participant.orderId || 'N/A'}
                  </span>
                </div>
                {ticketResult.participant.teamName && (
                  <div className="col-span-2">
                    <span className="text-[var(--fg-muted)] block text-[10px] uppercase tracking-wider">Team Name</span>
                    <span className="text-white font-semibold">{ticketResult.participant.teamName}</span>
                  </div>
                )}
                {ticketResult.dayNumber && (
                  <div>
                    <span className="text-[var(--fg-muted)] block text-[10px] uppercase tracking-wider">Event Day</span>
                    <span className="text-[var(--gold)] font-bold">Day {ticketResult.dayNumber}</span>
                  </div>
                )}
                {ticketResult.checkInTime && (
                  <div>
                    <span className="text-[var(--fg-muted)] block text-[10px] uppercase tracking-wider">Check-in Time</span>
                    <span className="text-gray-300">{ticketResult.checkInTime}</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
