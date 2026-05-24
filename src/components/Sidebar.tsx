'use client';

import { useState, useEffect } from 'react';
import { X, User, Phone, Clock, LogOut, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { UserProfile, OrderSummary } from '@/types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile | null;
  onLogout: () => void;
}

export default function Sidebar({ isOpen, onClose, profile, onLogout }: SidebarProps) {
  const [showOrders, setShowOrders] = useState(false);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Popup state
  const [showPopup, setShowPopup] = useState(false);
  const [popupOrders, setPopupOrders] = useState<OrderSummary[]>([]);
  const [loadingPopup, setLoadingPopup] = useState(false);
  const [is30DaysMode, setIs30DaysMode] = useState(false);
  const [loading30Days, setLoading30Days] = useState(false);

  const [cancelConfirm, setCancelConfirm] = useState<{ orderId: string; status: string } | null>(null);

  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!isOpen) {
      setShowOrders(false);
      setOrders([]);
      setHasMore(false);
      setShowPopup(false);
      setPopupOrders([]);
      setIs30DaysMode(false);
    }
  }, [isOpen]);

  const getSevenDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  };

  const getThirtyDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  };

  const toggleOrders = async () => {
    if (showOrders) {
      setShowOrders(false);
      return;
    }
    setShowOrders(true);
    if (orders.length === 0) {
      await fetchInitialOrders();
    }
  };

  const fetchInitialOrders = async () => {
    if (!profile) return;
    setLoadingOrders(true);
    const { data } = await supabase
      .from('orders')
      .select('id, display_order_id, total_amount, item_count, summary_text, status, created_at, received_at')
      .eq('user_id', profile.id)
      .gte('created_at', getSevenDaysAgo())
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1);

    const fetched = data || [];
    setOrders(fetched);
    setHasMore(fetched.length === PAGE_SIZE);
    setLoadingOrders(false);
  };

  const openLoadMorePopup = async () => {
    setShowPopup(true);
    setIs30DaysMode(false);
    setLoadingPopup(true);
    if (!profile) return;

    const { data } = await supabase
      .from('orders')
      .select('id, display_order_id, total_amount, item_count, summary_text, status, created_at, received_at')
      .eq('user_id', profile.id)
      .gte('created_at', getSevenDaysAgo())
      .order('created_at', { ascending: false });

    setPopupOrders(data || []);
    setLoadingPopup(false);
  };

  const fetch30Days = async () => {
    if (!profile) return;
    setLoading30Days(true);
    setIs30DaysMode(true);

    const { data } = await supabase
      .from('orders')
      .select('id, display_order_id, total_amount, item_count, summary_text, status, created_at, received_at')
      .eq('user_id', profile.id)
      .gte('created_at', getThirtyDaysAgo())
      .order('created_at', { ascending: false });

    setPopupOrders(data || []);
    setLoading30Days(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'accepted': return 'bg-yellow-100 text-yellow-700';
      case 'rejected': return 'bg-gray-200 text-gray-700';
      case 'cancelled': return 'bg-gray-200 text-gray-700';
      default: return 'bg-red-100 text-red-700';
    }
  };

  const cancelOrder = async (orderId: string, status: string) => {
    if (status === 'accepted') {
      setCancelConfirm({ orderId, status });
      return;
    }
    await doCancel(orderId);
  };

  const doCancel = async (orderId: string) => {
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    if (!error) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
      setPopupOrders(popupOrders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
    }
    setCancelConfirm(null);
  };

  const OrderCard = ({ order }: { order: OrderSummary }) => (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono font-bold text-orange-600">#{order.display_order_id}</span>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor(order.status)}`}>
          {order.status}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-1">{order.summary_text}</p>
      {order.status === 'accepted' && order.received_at && (
        <p className="text-xs text-blue-600 mb-1">
          🕐 Delivery by {new Date(new Date(order.received_at).getTime() + 60 * 60 * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </p>
      )}
      {order.status === 'rejected' && (
        <p className="text-xs text-red-500 mb-1">Sorry, we couldn&apos;t process this order.</p>
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">{formatDate(order.created_at)}</span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-green-600">₹{Number(order.total_amount).toFixed(0)}</span>
          {(order.status === 'pending' || order.status === 'accepted') && (
            <button
              onClick={() => cancelOrder(order.id, order.status)}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        className={`fixed inset-0 bg-black z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div className={`fixed top-0 left-0 w-full max-w-sm h-full bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header */}
        <div className="bg-orange-500 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">My Account</h2>
            <button onClick={onClose} className="hover:bg-orange-600 p-2 rounded-full transition-colors" aria-label="Close">
              <X size={24} />
            </button>
          </div>
          {profile && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User size={18} />
                <span className="font-semibold text-lg">{profile.name}</span>
              </div>
              {profile.phone && (
                <div className="flex items-center gap-2 text-orange-100">
                  <Phone size={16} />
                  <span className="text-sm">{profile.phone}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {/* Order History Toggle */}
            <button
              onClick={toggleOrders}
              className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-orange-500" />
                <span className="font-semibold">Order History</span>
              </div>
              {showOrders ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
            </button>

            {/* Inline Orders (max 20) */}
            {showOrders && (
              <div className="mt-2 space-y-3">
                {loadingOrders ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p>No orders yet</p>
                  </div>
                ) : (
                  <>
                    {orders.map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}

                    {/* Load More button — opens popup */}
                    {hasMore && (
                      <button
                        onClick={openLoadMorePopup}
                        className="w-full py-3 text-orange-500 font-semibold text-sm hover:bg-orange-50 rounded-lg transition-colors border border-orange-200"
                      >
                        Load More
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Logout */}
        <div className="p-4 border-t">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 p-3 text-red-500 hover:bg-red-50 rounded-lg font-semibold transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Full Order History Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl animate-[scaleIn_200ms_ease-out]">
            {/* Popup Header */}
            <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-lg font-bold text-gray-800">
                {is30DaysMode ? 'Last 30 Days' : 'Last 7 Days'}
              </h2>
              <button
                onClick={() => { setShowPopup(false); setIs30DaysMode(false); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Popup Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingPopup ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                </div>
              ) : popupOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>No orders found</p>
                </div>
              ) : (
                <>
                  {popupOrders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}

                  {/* See 30 days button */}
                  {!is30DaysMode && !loading30Days && (
                    <button
                      onClick={fetch30Days}
                      className="w-full py-3 text-orange-500 font-semibold text-sm hover:bg-orange-50 rounded-lg transition-colors border border-orange-200"
                    >
                      See Last 30 Days Orders
                    </button>
                  )}

                  {loading30Days && (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation popup */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex items-center justify-center p-4 animate-[fadeIn_200ms_ease-out]">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center shadow-2xl animate-[scaleIn_200ms_ease-out]">
            <p className="text-gray-700 font-medium mb-2">Cancel Order?</p>
            <p className="text-sm text-gray-500 mb-6">Your order may already be in preparation. Are you sure?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirm(null)}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={() => doCancel(cancelConfirm.orderId)}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
