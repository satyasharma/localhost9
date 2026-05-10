import Link from 'next/link';

export const metadata = {
  title: 'Terms & Privacy — localHost9',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-orange-500 font-semibold hover:underline text-sm">← Back to menu</Link>

        <h1 className="text-3xl font-bold text-gray-800 mt-6 mb-8">Terms & Conditions</h1>

        <div className="prose prose-gray max-w-none space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">1. About Us</h2>
            <p>localHost9 is a home-based cloud kitchen operating in Bengaluru, serving the Marathahalli, Whitefield, Mahadevpura, Indiranagar, and HAL areas. By placing an order on localhost9.in, you agree to these terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">2. Orders & Delivery</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Orders are accepted during our service hours (Saturday & Sunday, 9 AM – 9 PM).</li>
              <li>We deliver within a 10 km radius of our kitchen. Delivery is available only to serviceable pin codes.</li>
              <li>Estimated delivery time is within 1 hour of order acceptance.</li>
              <li>We reserve the right to reject or cancel orders due to unavailability, incorrect information, or operational constraints.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">3. Payment</h2>
            <p>Currently we accept Cash on Delivery (COD) only. The exact amount must be paid at the time of delivery. Online payment options will be added soon.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">4. Cancellation & Refunds</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Orders can be cancelled before they are accepted by us (status: Pending).</li>
              <li>Once an order is accepted (status: Received), it cannot be cancelled.</li>
              <li>If we are unable to fulfill your order after acceptance, we will notify you and no payment will be collected.</li>
              <li>Since payment is COD, refunds are not applicable at this time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">5. Food Safety</h2>
            <p>All food is prepared in a clean, hygienic home kitchen. We follow standard food safety practices. However, please inform us of any allergies via the special instructions field while ordering.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">6. Account & Authentication</h2>
            <p>You sign in using your Google account. We do not store your Google password. Your account is used to track your orders and save delivery addresses for convenience.</p>
          </section>

          <hr className="my-8" />

          <h1 className="text-3xl font-bold text-gray-800 mb-8">Privacy Policy</h1>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>From Google Sign-In:</strong> Your name and email address.</li>
              <li><strong>From you:</strong> Phone number, delivery address, and pin code (provided during checkout).</li>
              <li><strong>Order data:</strong> Items ordered, order total, delivery address, and order status.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To process and deliver your orders.</li>
              <li>To contact you regarding your order (via phone).</li>
              <li>To save your addresses for faster checkout next time.</li>
              <li>To show your order history.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">What We Don't Do</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>We do not sell or share your personal data with third parties.</li>
              <li>We do not send marketing emails or SMS.</li>
              <li>We do not track your browsing activity.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Data Storage</h2>
            <p>Your data is stored securely on Supabase (cloud database) with row-level security. Only you can access your own orders and addresses. Our admin can view orders for fulfillment purposes only.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Contact</h2>
            <p>For any questions about these terms or your data, reach us on WhatsApp: <a href="https://wa.me/918618725442" className="text-orange-500 hover:underline">+91 8618725442</a></p>
          </section>

          <p className="text-gray-400 text-xs mt-8">Last updated: May 2026</p>
        </div>
      </div>
    </div>
  );
}
