import React, { useState, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiquidGlass from './LiquidGlass';
import { leaningColor } from '../utils/politicalCompass';
import { useNationStore } from '../store/nationStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_WIDE = SCREEN_WIDTH > 768;

type GlassModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** If true, shows destructive (red) accent on confirm action area */
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
        style={styles.overlay}
      >
        {/* Dim backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View
          style={[
            styles.contentWrap,
            isBottomSheet
              ? {
                  paddingBottom: Math.max(insets.bottom, 12),
                  maxHeight: SCREEN_HEIGHT * 0.82,
                }
              : { maxWidth: 420, width: '92%', alignSelf: 'center' },
          ]}
        >
          <LiquidGlass
            radius={isBottomSheet ? 20 : 18}
            style={[
              styles.glass,
              isBottomSheet ? styles.bottomSheet : styles.centered,
              { borderColor: tint + '55' },
            ]}
            padded={false}
          >
            {/* Drag handle (mobile only) */}
            {isBottomSheet && <View style={styles.dragHandle} />}

            {/* Header */}
            {(title || description) && (
              <View style={styles.header}>
                {title && (
                  <Text
                    style={[
                      styles.title,
                      { color: destructive ? '#FF5A65' : '#F3F6FA' },
                    ]}
                  >
                    {title}
                  </Text>
                )}
                {description && (
                  <Text style={styles.description}>{description}</Text>
                )}
              </View>
            )}

            {/* Body */}
            {children && <View style={styles.body}>{children}</View>}

            {/* Footer / Actions */}
            {footer && <View style={styles.footer}>{footer}</View>}
          </LiquidGlass>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Imperative API state holder (singleton)
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

export function glassConfirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    confirmResolver = resolve;
    // Dispatch to host via global event (host listens)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('glass:confirm', { detail: opts })
      );
    } else {
      // Native: fall back to RN Alert if host not mounted (should never happen in prod)
      // eslint-disable-next-line no-alert
      const ok = confirm(opts.message); // web only path actually
      resolve(ok);
    }
  });
}

export function glassAlert(opts: AlertOptions): Promise<void> {
  return new Promise((resolve) => {
    alertResolver = resolve;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('glass:alert', { detail: opts }));
    } else {
      // eslint-disable-next-line no-alert
      alert(opts.message);
      resolve();
    }
  });
}

// Host component — mount once near root
export function GlassModalHost() {
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const [alertState, setAlertState] = useState<AlertOptions | null>(null);

  React.useEffect(() => {
    const onConfirm = (e: Event) => {
      const detail = (e as CustomEvent).detail as ConfirmOptions;
      setConfirmState(detail);
    };
    const onAlert = (e: Event) => {
      const detail = (e as CustomEvent).detail as AlertOptions;
      setAlertState(detail);
    };

    window.addEventListener('glass:confirm', onConfirm);
    window.addEventListener('glass:alert', onAlert);

    return () => {
      window.removeEventListener('glass:confirm', onConfirm);
      window.removeEventListener('glass:alert', onAlert);
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
              style={styles.actionBtn}
            >
              <Text style={styles.cancelText}>
                {confirmState?.cancelText || 'Cancel'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => closeConfirm(true)}
              style={[
                styles.actionBtn,
                styles.confirmBtn,
                confirmState?.destructive && { backgroundColor: '#FF5A65' },
              ]}
            >
              <Text style={styles.confirmText}>
                {confirmState?.confirmText || 'Confirm'}
              </Text>
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
            style={[styles.actionBtn, styles.singleBtn]}
          >
            <Text style={styles.confirmText}>OK</Text>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  contentWrap: {
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  glass: {
    overflow: 'hidden',
  },
  centered: {
    padding: 20,
  },
  bottomSheet: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    color: 'rgba(243,246,250,0.75)',
    lineHeight: 20,
  },
  body: {
    marginVertical: 8,
  },
  footer: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  singleBtn: {
    alignSelf: 'flex-end',
    minWidth: 92,
    alignItems: 'center',
  },
  confirmBtn: {
    backgroundColor: '#27D17A',
  },
  cancelText: {
    color: 'rgba(243,246,250,0.8)',
    fontSize: 15,
    fontWeight: '500',
  },
  confirmText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
});
