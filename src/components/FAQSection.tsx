import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What time does the party start and end?",
    answer: "The celebration kicks off at 21:00 (9 PM) and goes until 02:00 (2 AM). We recommend arriving right at 21:00 to catch the stunning sunset views from the 18th floor – it's absolutely breathtaking! The party will continue with music, dancing, and great vibes all night long.",
  },
  {
    question: "What's the dress code?",
    answer: "Smart casual to dressy! The venue is upscale, so dress to impress. Think stylish and comfortable – we want you to look great in photos while dancing the night away. The rooftop can get a bit breezy, so consider bringing a light jacket for the outdoor areas.",
  },
  {
    question: "Where exactly is the venue?",
    answer: "A'DAM 360 is located on the 18th floor of the A'DAM Tower in Amsterdam Noord. The address is Overhoeksplein 5, 1031 KS Amsterdam. It's easily accessible by the free ferry from behind Central Station (takes about 3 minutes). Once you arrive, take the elevator to the 18th floor.",
  },
  {
    question: "How do I get there?",
    answer: "The easiest way is to take the free ferry from behind Amsterdam Central Station (Buiksloterweg ferry). It runs 24/7 and takes just a few minutes. Alternatively, you can drive – there's paid parking at the A'DAM Tower, but spaces can fill up quickly. We highly recommend public transport or the ferry!",
  },
  {
    question: "Can I bring additional guests?",
    answer: "Yes! Please add them to your RSVP form so we can ensure we have enough space and refreshments for everyone. Just include their name and phone number when you RSVP. The more, the merrier!",
  },
  {
    question: "Will there be food and drinks?",
    answer: "There will be no food available at the event. However, the first round of drinks will be free! After that, drinks will be available for purchase at the venue bar.",
  },
  {
    question: "What's the view like?",
    answer: "The A'DAM 360 offers incredible 360° panoramic views of Amsterdam from 100 meters above ground. You'll see the entire city skyline, the IJ river, and on a clear day, views stretch for miles. The sunset from up there is absolutely magical!",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-24 relative">
      <div className="section-container">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="text-primary uppercase tracking-[0.2em] text-sm font-medium mb-4 block">
            Got Questions?
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            <span className="gold-text">FAQ</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Everything you need to know about the celebration.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="glass-card px-6 border-none"
              >
                <AccordionTrigger className="text-left font-display text-lg hover:text-primary hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
