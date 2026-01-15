import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-12 border-t border-border">
      <div className="section-container text-center">
        <p className="text-muted-foreground flex items-center justify-center gap-2">
          Made with <Heart className="w-4 h-4 text-primary fill-primary" /> for Toby's 22nd
        </p>
        <p className="text-muted-foreground/60 text-sm mt-2">
          February 21st, 2026 • A'DAM 360, Amsterdam
        </p>
      </div>
    </footer>
  );
};

export default Footer;
