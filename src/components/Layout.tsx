import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { AnnouncementBar } from "./AnnouncementBar";
import { CategoryNav } from "./CategoryNav";
import { BottomNav } from "./BottomNav";
import { FloatingContact } from "./FloatingContact";
import { BackButton } from "./BackButton";
import { VideoConsultation } from "./VideoConsultation";

export const Layout = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen flex flex-col">
    <AnnouncementBar />
    <Header />
    <CategoryNav />
    <BackButton />
    <main className="flex-1 pb-[72px] md:pb-0">{children}</main>
    <Footer />
    <BottomNav />
    <FloatingContact />
    <VideoConsultation />
  </div>
);

