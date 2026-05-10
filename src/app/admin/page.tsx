'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, CheckCircle, Package } from 'lucide-react';

interface AdminOrder {
  id: string;
  display_order_id: string;
  phone: string;
  delivery_address: string;
  total_amount: number;
  item_count: number;
  summary_text: string;
  status: string;
  notes: string;
  created_at: string;
}

const STATUS_FLOW = ['pending', 'preparing', 'out_for_delivery', 'delivered'];
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-orange-700', bg: 'bg-orange-100' },
  preparing: { label: 'Preparing', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-blue-700', bg: 'bg-blue-100' },
  delivered: { label: 'Delivered', color: 'text-green-700', bg: 'bg-green-100' },
};

type Filter = 'all' | 'pending' | 'preparing' | 'out_for_delivery' | 'delivered';

export default function AdminPage() {
  const [state, setState] = useState<'loading' | 'denied' | 'ready'>('loading');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const init = async () => {
    const token = await getToken();
    if (!token) {
      setState('denied');
      return;
    }
    // Try fetching orders — if 401, not admin
    const res = await fetch('/api/admin/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      setState('denied');
      return;
    }
    const data = await res.json();
    setOrders(data);
    setState('ready');
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    if (!token) return;
    const res = await fetch('/api/admin/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setOrders(data);
    }
    setLoading(false);
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    const token = await getToken();
    if (!token) return;
    await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status: newStatus }),
    });
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const getNextStatus = (s: string) => {
    const i = STATUS_FLOW.indexOf(s);
    return i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(o => o.created_at?.startsWith(todayStr));
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total_amount), 0);

  if (state === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" /></div>;
  }

  if (state === 'denied') {
    if (typeof window !== 'undefined') window.location.href = '/';
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">localHost9 Admin</h1>
            <p className="text-xs text-gray-500">Order Management</p>
          </div>
          <button onClick={fetchOrders} disabled={loading} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Refresh">
            <RefreshCw size={20} className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">Today</p>
            <p className="text-2xl font-bold">{todayOrders.length} orders</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">Revenue</p>
            <p className="text-2xl font-bold text-green-600">₹{todayRevenue.toFixed(0)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['all', 'pending', 'preparing', 'out_for_delivery', 'delivered'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                filter === f ? 'bg-orange-500 text-white' : 'bg-white text-gray-600'
              }`}
            >
              {f === 'all' ? 'All' : f === 'out_for_delivery' ? 'Delivery' : f.charAt(0).toUpperCase() + f.slice(1)}
              {' '}({f === 'all' ? orders.length : orders.filter(o => o.status === f).length})
            </button>
          ))}
        </div>

        {/* Orders */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400"><Package size={40} className="mx-auto mb-2" /><p>No orders</p></div>
        ) : (
          <div className="space-y-4">
            {filtered.map(order => {
              const conf = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const next = getNextStatus(order.status);
              const nextConf = next ? STATUS_CONFIG[next] : null;

              return (
                <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-orange-600">#{order.display_order_id}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${conf.bg} ${conf.color}`}>{conf.label}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">{order.summary_text}</p>
                  <div className="text-sm text-gray-500 space-y-0.5 mb-3">
                    <p>📞 {order.phone}</p>
                    <p>📍 {order.delivery_address}</p>
                    {order.notes && <p>📝 {order.notes}</p>}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <span className="font-bold text-green-600">₹{Number(order.total_amount).toFixed(0)}</span>
                      <span className="text-xs text-gray-400 ml-2">{formatDate(order.created_at)} {formatTime(order.created_at)}</span>
                    </div>
                    {next && nextConf ? (
                      <button
                        onClick={() => updateStatus(order.id, next)}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold"
                      >
                        → {nextConf.label}
                      </button>
                    ) : (
                      <span className="text-green-600 text-sm font-semibold flex items-center gap-1"><CheckCircle size={14} /> Done</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
