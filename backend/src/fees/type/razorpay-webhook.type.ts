/**
 * The subset of Razorpay's webhook payload this service actually reads.
 *
 * Typed rather than left as `JSON.parse(...)`'s implicit `any` so that
 * `order_id` / `id` are `string | undefined` and can be narrowed by the
 * existing guards. See the `payment.failed`, `payment.captured` and
 * `payment.authorized` branches in `FeesService.handleWebhookEvent`.
 */
export interface RazorpayWebhookEvent {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
      };
    };
  };
}
