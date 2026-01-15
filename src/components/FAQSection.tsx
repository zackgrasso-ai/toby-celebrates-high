import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What's the dress code?",
    answer: "Smart casual to dressy! The venue is upscale, so dress to impress. Think stylish and comfortable – we want you to look great in photos while dancing the night away.",
  },
  {
    question: "Where exactly is the venue?",
    answer: "A'DAM Lookout is located on the 18th floor of the A'DAM Tower in Amsterdam Noord. The address is Overhoeksplein 5, 1031 KS Amsterdam. It's easily accessible by the free ferry from behind Central Station.",
  },
  {
    question: "Is parking available?",
    answer: "Yes, there's paid parking available at the A'DAM Tower parking garage. However, we recommend using public transport or the free ferry from Central Station, as parking spots can fill up quickly.",
  },
  {
    question: "Can I bring additional guests?",
    answer: "Yes! Please add them to your RSVP form so we can ensure we have enough space for everyone. Just include their name and phone number when you RSVP.",
  },
  {
    question: "What time should I arrive?",
    answer: "We recommend arriving on time to catch the sunset views from the venue – it's absolutely stunning! The exact time will be communicated closer to the date.",
  },
  {
    question: "Will there be food and drinks?",
    answer: "Absolutely! There will be drinks and food available throughout the evening. Let us know of any dietary requirements when you RSVP.",
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
