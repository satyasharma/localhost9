'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, Clock, ChefHat, Truck, CheckCircle, LogOut, RefreshCw } from 'lucide-react';

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
  user_id: string;
}

type StatusFilter = 'all' | 'pending' | 'preparing' | 'out_for_delivery' | 'delivered';

const STATUS_FLOW = ['pending', 'preparing', 'out_for_delivery', 'delivered'];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: 'Pending', color: 'text-orange-700', bg: 'bg-orange-100', icon: Clock },
  preparing: { label: 'Preparing', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: ChefHat },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-blue-700', bg: 'bg-blue-100', icon: Truck },
  delivered: { label: 'Delivered', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle },
};

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState({ orders: 0, revenue: 0 });

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setIsAdmin(false);
      return;
    }

    const { data } = await supabase
      .from('admins')
      .select('id')
      .eq('email', session.user.email)
      .maybeSingle();

    if (data) {
      setIsAdmin(true);
      fetchOrders();
    } else {
      setIsAdmin(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    const allOrders = data || [];
    setOrders(allOrders);

    // Today's stats
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = allOrders.filter(o => o.created_at.startsWith(today));
    setTodayStats({
      orders: todayOrders.length,
      revenue: todayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
    });

    setLoading(false);
  }, []);

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert('Failed to update status');
      return;
    }

    setOrders(orders.map(o =>
      o.id === orderId ? { ...o, status: newStatus } : o
    ));
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const idx = STATUS_FLOW.indexOf(currentStatus);
    if (idx < STATUS_FLOW.length - 1) return STATUS_FLOW[idx + 1];
    return null;
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  // Loading
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-sm">
          <p className="text-xl font-bold text-gray-800 mb-2">Access Denied</p>
          <p className="text-gray-500 mb-4">You don't have admin access.</p>
          <a href="/" className="text-orange-500 font-semibold hover:underline">← Back to menu</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">localHost9 Admin</h1>
            <p className="text-xs text-gray-500">Order Management</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchOrders}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Refresh"
            >
              <RefreshCw size={20} className="text-gray-600" />
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Logout"
            >
              <LogOut size={20} className="text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">Today's Orders</p>
            <p className="text-2xl font-bold text-gray-800">{todayStats.orders}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">Today's Revenue</p>
            <p className="text-2xl font-bold text-green-600">₹{todayStats.revenue.toFixed(0)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['all', 'pending', 'preparing', 'out_for_delivery', 'delivered'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f === 'all' ? `All (${orders.length})` :
               f === 'out_for_delivery' ? `Delivery (${orders.filter(o => o.status === f).length})` :
               `${f.charAt(0).toUpperCase() + f.slice(1)} (${orders.filter(o => o.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Orders */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Package size={48} className="mx-auto mb-3" />
            <p>No orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusConf = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConf.icon;
              const nextStatus = getNextStatus(order.status);
              const nextConf = nextStatus ? STATUS_CONFIG[nextStatus] : null;

              return (
                <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
                  {/* Order header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-orange-600 text-lg">#{order.display_order_id}</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusConf.bg} ${statusConf.color}`}>
                        {statusConf.label}
                      </span>
                    </div>
                    <span className="text-sm text-gray-400">{formatTime(order.created_at)}</span>
                  </div>

                  {/* Items */}
                  <p className="text-sm text-gray-700 font-medium mb-2">{order.summary_text}</p>

                  {/* Customer info */}
                  <div className="text-sm text-gray-500 space-y-1 mb-3">
                    <p>📞 {order.phone}</p>
                    <p>📍 {order.delivery_address}</p>
                    {order.notes && <p>📝 {order.notes}</p>}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="font-bold text-green-600 text-lg">₹{Number(order.total_amount).toFixed(0)}</span>

                    {nextStatus && nextConf && (
                      <button
                        onClick={() => updateStatus(order.id, nextStatus)}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold text-sm transition-colors"
                      >
                        <StatusIcon size={16} />
                        Mark as {nextConf.label}
                      </button>
                    )}

                    {!nextStatus && (
                      <span className="flex items-center gap-1 text-green-600 font-semibold text-sm">
                        <CheckCircle size={16} />
                        Completed
                      </span>
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
