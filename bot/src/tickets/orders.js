'use strict';

/**
 * Lightweight order/invoice tracking on top of the JSON ticket store. Each
 * purchase ticket creates an order so manual sales become a real pipeline:
 * pending → paid → delivered (or cancelled). Staff move the status from inside
 * the ticket; `/orders` summarises the pipeline.
 */
const store = require('../store');
const config = require('../config');

const STATUSES = ['pending', 'paid', 'delivered', 'cancelled'];
const E = config.orderEmojis || {};
const STATUS_META = {
  pending: { label: 'Pending', emoji: E.pending || '🕓' },
  paid: { label: 'Paid', emoji: E.paid || '💰' },
  delivered: { label: 'Delivered', emoji: E.delivered || '✅' },
  cancelled: { label: 'Cancelled', emoji: E.cancelled || '✖️' },
};

function createOrder({ channelId, ownerId, product, botName, payment, paymentLabel }) {
  let order = null;
  store.update((d) => {
    d.orders = d.orders || {};
    d.orderCounter = (d.orderCounter || 0) + 1;
    const id = `ORD-${String(d.orderCounter).padStart(4, '0')}`;
    order = {
      id,
      number: d.orderCounter,
      channelId,
      ownerId,
      productId: product?.id || null,
      productLabel: product?.label || 'Custom',
      price: product?.price || null,
      botName: botName || null,
      payment: payment || null,
      paymentLabel: paymentLabel || null,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      updatedBy: null,
    };
    d.orders[id] = order;
  });
  return order;
}

function getByChannel(channelId) {
  const d = store.read();
  return Object.values(d.orders || {}).find((o) => o.channelId === channelId) || null;
}

function setStatus(channelId, status, actorId) {
  if (!STATUSES.includes(status)) return null;
  let updated = null;
  store.update((d) => {
    const o = Object.values(d.orders || {}).find((x) => x.channelId === channelId);
    if (o) {
      o.status = status;
      o.updatedAt = Date.now();
      o.updatedBy = actorId || null;
      updated = o;
    }
  });
  return updated;
}

function list(filter) {
  const d = store.read();
  let arr = Object.values(d.orders || {});
  if (filter && STATUSES.includes(filter)) arr = arr.filter((o) => o.status === filter);
  return arr.sort((a, b) => b.number - a.number);
}

/** A customer's own orders (their purchase/invoice history), newest first. */
function listForOwner(ownerId) {
  const d = store.read();
  return Object.values(d.orders || {})
    .filter((o) => o.ownerId === String(ownerId))
    .sort((a, b) => b.number - a.number)
    .map((o) => ({
      id: o.id,
      productLabel: o.productLabel,
      botName: o.botName || null,
      price: o.price || null,
      payment: o.paymentLabel || o.payment || null,
      status: o.status,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));
}

/** { pending, paid, delivered, cancelled } counts. */
function counts() {
  const d = store.read();
  const c = { pending: 0, paid: 0, delivered: 0, cancelled: 0 };
  for (const o of Object.values(d.orders || {})) if (c[o.status] != null) c[o.status]++;
  return c;
}

module.exports = { STATUSES, STATUS_META, createOrder, getByChannel, setStatus, list, listForOwner, counts };
