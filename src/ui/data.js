/**
 * Static UI data for the Commerce Flight page.
 *
 * Keeping data out of controllers makes scene additions a configuration
 * change instead of a rendering-code change.
 */

export const scenes = {
  integrations: {
    kicker: 'Integration mesh',
    title: 'All channels orbit one source of truth',
    health: '99.99',
    status: 'Stable',
    throughput: '42k',
    percent: '86%',
    value: '86%',
    copy: 'Product data, inventory and price rules are reconciled before each channel receives the next clean state.',
    nodes: [
      ['ERP', 50, 16, 'aqua'],
      ['WMS', 78, 34, 'amber'],
      ['AI', 68, 76, 'rose'],
      ['POS', 24, 72, 'mint'],
      ['B2B', 18, 36, 'aqua'],
    ],
    route: ['Catalog normalized', 'Inventory committed', 'Channel rules published', 'Exceptions queued'],
  },
  orders: {
    kicker: 'Order theatre',
    title: 'Every order carries its own visible flight path',
    health: '98.74',
    status: 'Busy',
    throughput: '9.6k',
    percent: '74%',
    value: '74%',
    copy: 'Payment, fraud, warehouse, carrier and customer updates resolve into one operational timeline.',
    nodes: [
      ['Paid', 50, 14, 'mint'],
      ['Pick', 80, 45, 'aqua'],
      ['Pack', 62, 78, 'amber'],
      ['Ship', 25, 70, 'rose'],
      ['Care', 18, 35, 'mint'],
    ],
    route: ['Payment captured', 'Stock reserved', 'Label generated', 'Customer notified'],
  },
  map: {
    kicker: 'Logistics map',
    title: 'Regional demand lights up before stock runs thin',
    health: '97.18',
    status: 'Forecasting',
    throughput: '128',
    percent: '91%',
    value: '91%',
    copy: 'The system projects channel demand, warehouse risk and carrier capacity across regions before SLA pressure rises.',
    nodes: [
      ['North', 48, 18, 'aqua'],
      ['East', 78, 42, 'mint'],
      ['Hub', 50, 52, 'amber'],
      ['South', 56, 82, 'rose'],
      ['West', 20, 48, 'aqua'],
    ],
    route: ['Demand forecasted', 'Carrier risk scored', 'Stock repositioned', 'SLA protected'],
  },
};

export const notes = [
  'Validation is clean. AI marked 42 listings for price review before the morning marketplace sync.',
  'Exceptions are grouped by root cause. One approval releases ERP state, labels and customer messages.',
  'SLA pressure is low. The next batch can move through the faster carrier lane without manual review.',
];

export const colorMap = {
  aqua: '#4ee7ff',
  mint: '#7af7b1',
  amber: '#ffc36b',
  rose: '#ff6f9e',
};

export const sceneTabClasses = {
  active:
    'scene-tab rounded-md border border-aqua/[0.45] bg-aqua px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-ink',
  inactive:
    ' rounded-md border border-white/[0.12] bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-300',
};
