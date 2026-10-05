/**
 * The subset of Razorpay's webhook payload this service actually reads.
 *
 * Typed rather than left as `JSON.parse(...)`'s implicit `any` so that
 * `order_id` / `id` are `string | undefined` and can be narrowed by the
 * existing guards. See the `payment.failed` and `payment.captured` branches in
 * `FeesService.handleWebhook`.
 */
export interface RazorpayWebhookEvent {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
      };
    };
  };
}
