import React, { useMemo } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { colors, spacing, typography } from '../design-system/tokens';
import type { CheckoutOrder } from '../types';

export interface CheckoutResult { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
export interface CheckoutProps {
  visible: boolean; order: CheckoutOrder | null; prefill: { name: string; email: string; contact: string };
  onSuccess: (r: CheckoutResult) => void; onFailure: (reason: string) => void; onDismiss: () => void;
}

const esc = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c');

/**
 * Native (Expo Go compatible) Razorpay Standard Checkout, hosted in a WebView.
 * The WebView only reports what Razorpay returned; the BACKEND verifies the signature.
 * This needs internet access and Razorpay TEST keys configured on the backend.
 */
export default function RazorpayCheckout({ visible, order, prefill, onSuccess, onFailure, onDismiss }: CheckoutProps) {
  const html = useMemo(() => {
    if (!order) return '';
    const options = {
      key: order.key_id, order_id: order.razorpay_order_id, amount: order.amount, currency: order.currency,
      name: 'MediBook (demo)', description: `Booking ${order.appointment_reference}`, prefill, theme: { color: colors.primary },
    };
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F5F8FC;font-family:sans-serif"><p style="padding:24px;color:#55657E">Opening secure checkout…</p>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script><script>
function post(m){window.ReactNativeWebView.postMessage(JSON.stringify(m));}
try{
 var o=${esc(options)};
 o.handler=function(r){post({type:'success',data:r});};
 o.modal={ondismiss:function(){post({type:'dismiss'});}};
 var rz=new Razorpay(o);
 rz.on('payment.failed',function(r){post({type:'failed',data:r.error});});
 rz.open();
}catch(e){post({type:'error',data:String(e)});}
</script></body></html>`;
  }, [order, prefill]);

  return (
    <Modal visible={visible && !!order} animationType="slide" onRequestClose={onDismiss}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg }}>
          <Text style={typography.heading}>Secure payment</Text>
          <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close payment" hitSlop={10}><Text style={[typography.label, { color: colors.primary }]}>Close</Text></Pressable>
        </View>
        <WebView originWhitelist={['*']} source={{ html, baseUrl: 'https://checkout.razorpay.com' }} javaScriptEnabled domStorageEnabled
          setSupportMultipleWindows={false} style={{ flex: 1, backgroundColor: colors.bg }}
          onMessage={(e) => {
            try {
              const m = JSON.parse(e.nativeEvent.data);
              if (m.type === 'success') onSuccess(m.data);
              else if (m.type === 'failed') onFailure(m.data?.description || 'Payment failed');
              else if (m.type === 'error') onFailure('Could not load the checkout. Check your internet connection.');
              else onDismiss();
            } catch { onFailure('Unexpected checkout response.'); }
          }} />
      </SafeAreaView>
    </Modal>
  );
}
