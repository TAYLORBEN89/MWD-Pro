import { isNative, isAndroid, isIOS } from './platform';
import { getApiUrl } from './api';
import { Browser } from '@capacitor/browser';
import { httpClient } from './httpClient';

// Product IDs for Native Stores
export const PRODUCT_ID_ANDROID = 'mwd_pro_full_course';
export const PRODUCT_ID_IOS = 'mwd_pro_full_course_ios';

export interface PaymentHandlerOptions {
  userId: string;
  userEmail: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  onProgress: (isProcessing: boolean) => void;
  stripePromise: any; // Passed from App.tsx
}

declare var CdvPurchase: any;

class PaymentService {
  private storeInitialized = false;
  private currentUserId: string | null = null;

  async initializeNativeStore(userId: string, onSuccess: () => void) {
    if (!isNative() || this.storeInitialized) {
      if (userId) this.currentUserId = userId;
      return;
    }

    this.currentUserId = userId;
    console.log("Initializing Native Store for User:", userId);

    try {
      const { store, ProductType, Platform } = CdvPurchase;

      // 1. Register Products
      store.register([{
        id: PRODUCT_ID_ANDROID,
        type: ProductType.NON_CONSUMABLE,
        platform: Platform.GOOGLE_PLAY,
      }, {
        id: PRODUCT_ID_IOS,
        type: ProductType.NON_CONSUMABLE,
        platform: Platform.APPLE_APPSTORE,
      }]);

      // 2. Handle Errors Early
      store.error((error: any) => {
        console.error("STORE ERROR:", error.code, error.message);
      });

      // 3. Handle Approvals
      store.when().approved(async (transaction: any) => {
        console.log("PURCHASE APPROVED:", transaction.productId);
        
        try {
          const verified = await this.verifyNativePurchase(transaction);
          if (verified) {
            console.log("PURCHASE VERIFIED. Finishing transaction...");
            await transaction.finish();
            onSuccess();
          } else {
            console.error("BACKEND VERIFICATION FAILED. Check server logs.");
          }
        } catch (err) {
          console.error("VERIFICATION ERROR:", err);
        }
      });

      // 4. Handle Pending/Finished for cleaner state
      store.when().finished((transaction: any) => {
        console.log("TRANSACTION FINISHED:", transaction.productId);
      });

      // 5. Initialize & Refresh
      console.log("Starting store initialization...");
      await store.initialize([
        isAndroid() ? Platform.GOOGLE_PLAY : Platform.APPLE_APPSTORE
      ]);

      // Critical: Update local products after init
      await store.update();

      this.storeInitialized = true;
      console.log("NATIVE STORE READY");
    } catch (err) {
      console.error("CRITICAL STORE INIT FAILURE:", err);
    }
  }

  private async verifyNativePurchase(transaction: any): Promise<boolean> {
    try {
      console.log("Sending verification request to server...");
      const response = await httpClient(getApiUrl('/api/verify-native-purchase'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: isAndroid() ? 'android' : 'ios',
          transactionId: transaction.transactionId,
          productId: transaction.productId,
          purchaseToken: transaction.purchaseToken,
          receipt: transaction.receipt,
          userId: this.currentUserId
        }),
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("Server rejected verification:", response.status, errData);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("Network error during verification:", err);
      return false;
    }
  }

  async startPurchase(options: PaymentHandlerOptions) {
    const { userId, userEmail, onSuccess, onError, onProgress, stripePromise } = options;
    onProgress(true);

    try {
      if (isNative()) {
        const { store } = CdvPurchase;
        const productId = isAndroid() ? PRODUCT_ID_ANDROID : PRODUCT_ID_IOS;
        
        // Ensure products are up to date
        await store.update();
        const product = store.get(productId);

        if (!product) {
          throw new Error(`Product ${productId} not found in store. Check IDs in Play Console.`);
        }

        if (!product.canPurchase) {
          console.warn("Product status:", product.state);
          throw new Error("This product is currently unavailable (Store state: " + product.state + ")");
        }

        console.log("Launching purchase flow for:", productId);
        const offer = product.getOffer();
        if (offer) {
          await offer.order();
        } else {
          // Fallback for some non-consumable types
          await product.order();
        }
      } else {
        // Stripe Web Flow
        const response = await httpClient(getApiUrl('/api/create-checkout-session'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, userEmail }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to create checkout session");

        if (data.url) {
          window.location.href = data.url;
        } else {
          const stripe = await stripePromise;
          const { error } = await stripe.redirectToCheckout({ sessionId: data.id });
          if (error) throw error;
        }
      }
    } catch (err: any) {
      console.error("Purchase Error:", err);
      onError(err.message || "An error occurred during purchase.");
    } finally {
      onProgress(false);
    }
  }
}

export const payments = new PaymentService();
