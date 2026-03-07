// Complete Order Processing Saga Example
// Demonstrates cross-service transaction with compensation

interface OrderContext {
  orderId?: string;
  paymentId?: string;
  inventoryReserved?: boolean;
  shippingId?: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
  total: number;
}

// Assumes Saga class from references/pattern-saga.md

const orderSaga = new Saga<OrderContext>()
  .addStep({
    name: "Create Order",
    execute: async (ctx) => {
      const order = await orderService.create({
        customerId: ctx.customerId,
        items: ctx.items,
        total: ctx.total,
      });
      return { ...ctx, orderId: order.id };
    },
    compensate: async (ctx) => {
      if (ctx.orderId) {
        await orderService.cancel(ctx.orderId);
      }
      return { ...ctx, orderId: undefined };
    },
  })
  .addStep({
    name: "Process Payment",
    execute: async (ctx) => {
      const payment = await paymentService.charge({
        customerId: ctx.customerId,
        amount: ctx.total,
        orderId: ctx.orderId!,
      });
      return { ...ctx, paymentId: payment.id };
    },
    compensate: async (ctx) => {
      if (ctx.paymentId) {
        await paymentService.refund(ctx.paymentId);
      }
      return { ...ctx, paymentId: undefined };
    },
    retryable: true,
    maxRetries: 3,
  })
  .addStep({
    name: "Reserve Inventory",
    execute: async (ctx) => {
      await inventoryService.reserve(ctx.orderId!, ctx.items);
      return { ...ctx, inventoryReserved: true };
    },
    compensate: async (ctx) => {
      if (ctx.inventoryReserved && ctx.orderId) {
        await inventoryService.release(ctx.orderId);
      }
      return { ...ctx, inventoryReserved: false };
    },
  })
  .addStep({
    name: "Create Shipment",
    execute: async (ctx) => {
      const shipment = await shippingService.create({
        orderId: ctx.orderId!,
        customerId: ctx.customerId,
      });
      return { ...ctx, shippingId: shipment.id };
    },
    compensate: async (ctx) => {
      if (ctx.shippingId) {
        await shippingService.cancel(ctx.shippingId);
      }
      return { ...ctx, shippingId: undefined };
    },
  })
  .onComplete((step, ctx) => {
    console.log(`Step ${step} completed. Order: ${ctx.orderId}`);
  })
  .onFail((step, error) => {
    console.error(`Step ${step} failed:`, error.message);
  });

// Execute the saga
const result = await orderSaga.execute({
  customerId: "cust-123",
  items: [{ productId: "prod-1", quantity: 2 }],
  total: 99.99,
});

if (result.success) {
  console.log("Order created:", result.context.orderId);
} else {
  console.error("Order failed at:", result.failedStep);
  console.error("Compensated steps:", result.completedSteps);
}
