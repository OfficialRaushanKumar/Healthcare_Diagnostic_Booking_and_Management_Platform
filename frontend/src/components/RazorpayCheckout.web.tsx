import { useEffect, useRef } from 'react';
import { colors } from '../design-system/tokens';
import type { CheckoutProps } from './RazorpayCheckout';

declare global { interface Window { Razorpay?: any } }

function loadScript(): Promise<void> {
  return new Promise((res, rej) => {
    if (window.Razorpay) return res();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => res(); s.onerror = () => rej(new Error('load'));
    document.body.appendChild(s);
  });
}

/** Browser build: opens Razorpay's hosted modal directly. The backend still verifies the signature. */
export default function RazorpayCheckout({ visible, order, prefill, onSuccess, onFailure, onDismiss }: CheckoutProps) {
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!visible || !order || opened.current === order.razorpay_order_id) return;
    opened.current = order.razorpay_order_id;
    loadScript().then(() => {
      const rz = new window.Razorpay({
        key: order.key_id, order_id: order.razorpay_order_id, amount: order.amount, currency: order.currency,
        name: 'MediBook (demo)', description: `Booking ${order.appointment_reference}`, prefill, theme: { color: colors.primary },
        handler: (r: any) => onSuccess(r),
        modal: { ondismiss: () => { opened.current = null; onDismiss(); } },
      });
      rz.on('payment.failed', (r: any) => { opened.current = null; onFailure(r?.error?.description || 'Payment failed'); });
      rz.open();
    }).catch(() => { opened.current = null; onFailure('Could not load the checkout. Check your internet connection.'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, order]);
  return null;
}
