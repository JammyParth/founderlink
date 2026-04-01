import { Injectable } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RazorpayPaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

@Injectable({
  providedIn: 'root'
})
export class RazorpayService {
  launchPayment(orderData: any): Observable<RazorpayPaymentResult> {
    return new Observable((observer: Observer<RazorpayPaymentResult>) => {
      if (typeof window === 'undefined' || !(window as any).Razorpay) {
        observer.error(new Error('Payment gateway is currently unavailable.'));
        return;
      }

      const options = {
        key: environment.razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'FounderLink',
        description: 'Startup Investment Transfer',
        order_id: orderData.orderId,
        handler: (response: any) => {
          observer.next({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          observer.complete();
        },
        modal: {
          ondismiss: () => {
            observer.error(new Error('Payment was cancelled by the user.'));
          }
        },
        prefill: {
          name: 'Investor',
          email: 'investor@example.com'
        },
        theme: {
          color: '#2563EB' // blue-600
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        observer.error(new Error(response.error.description || 'Payment failed.'));
      });
      
      rzp.open();
    });
  }
}
