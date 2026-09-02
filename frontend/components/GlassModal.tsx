import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidGlass from './LiquidGlass';
import { leaningColor } from '../utils/politicalCompass';
import { useNationStore } from '../store/nationStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_WIDE = SCREEN_WIDTH > 720;

type GlassModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  destructive?: boolean;
};

export function GlassModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  destructive,
}: GlassModalProps) {
  const insets = useSafeAreaInsets();
  const nation = useNationStore((s) => s.nation);
  const tint = leaningColor(nation);
  const isBottomSheet = !IS_WIDE;

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Modal
      visible={open}
      transparent
      animationType={isBottomSheet ? 'slide' : 'fade'}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.overlay, isBottomSheet && styles.overlayBottom]}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View
          style={[
            styles.contentWrap,
            isBottomSheet
              ? {
                  paddingBottom: Math.max(insets.bottom, 16),
                  maxHeight: SCREEN_HEIGHT * 0.82,
                  width: '100%',
                }
              : { maxWidth: 420, width: '92%', alignSelf: 'center' },
          ]}
          pointerEvents="box-none"
        >
          <LiquidGlass
            dense
            radius={isBottomSheet ? 28 : 24}
            style={[
              styles.glass,
              isBottomSheet ? styles.bottomSheet : styles.centered,
            ]}
            padded={false}
          >
            {/* Compass accent line */}
            <View style={[styles.accent, { backgroundColor: destructive ? '#FF5A65' : tint }]} />

            {isBottomSheet && <View style={styles.dragHandle} />}

            {(title || description) && (
              <View style={styles.header}>
                {title ? (
                  <Text
                    // @ts-expect-error web className
                    className="asme-title"
                    style={[styles.title, destructive && { color: '#FF8A92' }]}
                  >
                    {title}
                  </Text>
                ) : null}
                {description ? <Text style={styles.description}>{description}</Text> : null}
              </View>
            )}

            {children ? <View style={styles.body}>{children}</View> : null}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </LiquidGlass>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type AlertOptions = {
  title: string;
  message: string;
};

let confirmResolver: ((value: boolean) => void) | null = null;
let alertResolver: (() => void) | null = null;
let hostReady = false;
const pending: Array<() => void> = [];

function emit(name: string, detail: unknown) {
  const run = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }
  };
  if (hostReady) run();
  else pending.push(run);
}

export function glassConfirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    confirmResolver = resolve;
    emit('glass:confirm', opts);
  });
}

export function glassAlert(opts: AlertOptions): Promise<void> {
  return new Promise((resolve) => {
    alertResolver = resolve;
    emit('glass:alert', opts);
  });
}

export function GlassModalHost() {
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const [alertState, setAlertState] = useState<AlertOptions | null>(null);
  const nation = useNationStore((s) => s.nation);
  const tint = leaningColor(nation);

  useEffect(() => {
    hostReady = true;
    while (pending.length) pending.shift()?.();
    const onConfirm = (e: Event) => {
      setConfirmState((e as CustomEvent).detail as ConfirmOptions);
    };
    const onAlert = (e: Event) => {
      setAlertState((e as CustomEvent).detail as AlertOptions);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('glass:confirm', onConfirm);
      window.addEventListener('glass:alert', onAlert);
    }
    return () => {
      hostReady = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('glass:confirm', onConfirm);
        window.removeEventListener('glass:alert', onAlert);
      }
    };
  }, []);

  const closeConfirm = (result: boolean) => {
    setConfirmState(null);
    if (confirmResolver) {
      confirmResolver(result);
      confirmResolver = null;
    }
  };

  const closeAlert = () => {
    setAlertState(null);
    if (alertResolver) {
      alertResolver();
      alertResolver = null;
    }
  };

  return (
    <>
      <GlassModal
        open={!!confirmState}
        onOpenChange={(o) => !o && closeConfirm(false)}
        title={confirmState?.title}
        description={confirmState?.message}
        destructive={confirmState?.destructive}
        footer={
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={() => closeConfirm(false)}
              style={styles.ghostBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.ghostText}>{confirmState?.cancelText || 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => closeConfirm(true)}
              style={[
                styles.solidBtn,
                {
                  backgroundColor: confirmState?.destructive ? '#FF5A65' : tint,
                },
              ]}
              activeOpacity={0.88}
            >
              <Text style={styles.solidText}>{confirmState?.confirmText || 'Confirm'}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <GlassModal
        open={!!alertState}
        onOpenChange={(o) => !o && closeAlert()}
        title={alertState?.title}
        description={alertState?.message}
        footer={
          <TouchableOpacity
            onPress={closeAlert}
            style={[styles.solidBtn, styles.singleBtn, { backgroundColor: tint }]}
            activeOpacity={0.88}
          >
            <Text style={styles.solidText}>OK</Text>
          </TouchableOpacity>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  overlayBottom: {
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)' } as object) : null),
  },
  contentWrap: {
    paddingHorizontal: 16,
    zIndex: 2,
  },
  glass: {
    overflow: 'hidden',
  },
  centered: {
    padding: 22,
    paddingTop: 20,
  },
  bottomSheet: {
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 28,
    right: 28,
    height: 2,
    borderRadius: 2,
    opacity: 0.9,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '500',
    color: '#F3F6FA',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  description: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.72)',
    lineHeight: 21,
  },
  body: {
    marginVertical: 10,
  },
  footer: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  ghostBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ghostText: {
    color: 'rgba(243,246,250,0.88)',
    fontSize: 15,
    fontWeight: '600',
  },
  solidBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    minWidth: 108,
    alignItems: 'center',
  },
  singleBtn: {
    alignSelf: 'flex-end',
  },
  solidText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
});
