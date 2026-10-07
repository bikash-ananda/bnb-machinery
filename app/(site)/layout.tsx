import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NoticeBar from "@/components/notices/NoticeBar";
import OfferCard from "@/components/notices/OfferCard";
import CartDrawer from "@/components/shop/CartDrawer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NoticeBar />
      <Header />
      {children}
      <Footer />
      <CartDrawer />
      <OfferCard />
    </>
  );
}