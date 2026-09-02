'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Users,
  Building,
  Zap,
  Crown,
  Gift,
  Rocket,
  Ticket,
  CreditCard,
  BarChart3,
  Mail,
  Smartphone,
  QrCode,
  Award,
  TrendingUp,
  MessageSquare,
  Share2,
  Infinity,
  Palette,
  Settings,
  UserCheck,
  Shield,
  Briefcase,
  Zap as Lightning
} from 'lucide-react';

export default function PricingPage() {
  const pricingPlans = [
    {
      name: 'Free Forever',
      subtitle: 'Get Started',
      description: 'Everything you need to launch amazing events',
      price: '₹0',
      priceNote: '700 people included',
      additionalCost: 'Then just ₹3/person',
      icon: Gift,
      popular: true,
      features: [
        { icon: Users, text: 'Up to 700 attendees FREE' },
        { icon: Ticket, text: 'Beautiful ticket generation' },
        { icon: CreditCard, text: 'Secure payment collection' },
        { icon: BarChart3, text: 'Real-time analytics' },
        { icon: Mail, text: 'Email & SMS notifications' },
        { icon: QrCode, text: 'QR check-in system' },
        { icon: Award, text: 'Custom certificates' },
        { icon: TrendingUp, text: 'Revenue tracking' },
        { icon: MessageSquare, text: 'WhatsApp integration' },
        { icon: Share2, text: 'Social media tools' }
      ],
      perks: [
        'No hidden fees',
        'Setup in 5 minutes',
        '24/7 support included'
      ],
      buttonText: 'Start Building',
      buttonLink: '/signup',
      isPrimary: true
    },
    {
      name: 'Enterprise',
      subtitle: 'Scale Unlimited',
      description: 'Built for universities & large organizations',
      price: 'Custom',
      priceNote: 'Tailored for your needs',
      additionalCost: '3 events free trial',
      icon: Crown,
      popular: false,
      features: [
        { icon: Rocket, text: 'Everything in Free Forever' },
        { icon: Infinity, text: 'Unlimited events & attendees' },
        { icon: Building, text: 'Multi-campus management' },
        { icon: Palette, text: 'White-label branding' },
        { icon: Settings, text: 'Custom integrations' },
        { icon: UserCheck, text: 'Team collaboration tools' },
        { icon: Smartphone, text: 'Mobile app (branded)' },
        { icon: Zap, text: 'Advanced sponsorship tools' },
        { icon: BarChart3, text: 'Enterprise analytics' },
        { icon: Shield, text: 'Premium security' },
        { icon: Briefcase, text: 'Dedicated account manager' },
        { icon: Lightning, text: 'Priority support' }
      ],
      perks: [
        'Volume discounts',
        'Free migration help',
        'Custom development'
      ],
      buttonText: 'Let\'s Talk',
      buttonLink: '/contact',
      isPrimary: false
    },
  ];

  const faqs = [
    {
      question: "What happens after 700 people on the free plan?",
      answer: "Just ₹3 per person after that. No monthly fees, no surprises. Pay only for what you use."
    },
    {
      question: "Is there really no catch with the free plan?",
      answer: "Nope! 700 people, full features, forever free. We make money when you grow, so your success is our success."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Of course! No contracts, no cancellation fees. Though we're pretty confident you'll love it."
    },
    {
      question: "What about payment processing fees?",
      answer: "Standard payment processing fees apply (around 2%). But all our platform features are included at no extra cost."
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-[family-name:var(--font-josefin)] overflow-hidden relative">
      
      {/* Pattern Overlay */}
      <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none fixed"></div>

      {/* Hero Section */}
      <section className="relative pb-10 sm:pb-20 pt-6 sm:pt-10 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-1.5 sm:py-2 border border-[var(--gold)] mb-5 sm:mb-8">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[var(--gold)] rounded-full"></span>
              <span className="text-[var(--gold)] text-[0.6rem] sm:text-sm font-bold uppercase tracking-widest">Simple. Powerful. Free to start.</span>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[var(--gold)] rounded-full"></span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold mb-4 sm:mb-8 font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
              Pricing that <br />
              <span className="text-[var(--primary)]">makes sense</span>
            </h1>

            <p className="text-sm sm:text-xl text-[var(--fg-muted)] mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed">
              Start free, grow unlimited. No surprises, no gotchas.
              <br />
              <span className="text-[var(--primary)] font-bold uppercase tracking-wide text-xs sm:text-sm mt-2 sm:mt-4 block">Just amazing events.</span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative z-10 pb-16 sm:pb-32">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-12 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => {
              const Icon = plan.icon;
              const isPrimary = plan.isPrimary;

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.3, ease: "easeOut" }}
                  className="relative group h-full"
                >
                  <div className={`relative h-full bg-[var(--bg-card)] border ${isPrimary ? 'border-[var(--primary)]' : 'border-[var(--gold)]'} p-5 sm:p-8 md:p-12 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(200,16,46,0.1)]`}>
                    
                    {/* Corner Brackets */}
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[var(--fg)] opacity-50"></div>
                    <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[var(--fg)] opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[var(--fg)] opacity-50"></div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[var(--fg)] opacity-50"></div>

                    {/* Popular badge */}
                    {plan.popular && (
                      <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
                        <div className="bg-[var(--primary)] text-[var(--fg)] px-6 py-2 border border-[var(--primary)] text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg">
                          <Crown className="w-3 h-3" />
                          Most Popular
                        </div>
                      </div>
                    )}

                    {/* Header */}
                    <div className="mb-6 sm:mb-10 text-center border-b border-[var(--border-subtle)] pb-6 sm:pb-8">
                       <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 border ${isPrimary ? 'border-[var(--primary)]' : 'border-[var(--gold)]'} rounded-full flex items-center justify-center bg-[var(--bg)]`}>
                        <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${isPrimary ? 'text-[var(--primary)]' : 'text-[var(--gold)]'} `} />
                      </div>
                       
                      <h3 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-1.5 sm:mb-2 uppercase tracking-wide">{plan.name}</h3>
                      <p className={`text-xs sm:text-sm font-bold uppercase tracking-widest ${isPrimary ? 'text-[var(--primary)]' : 'text-[var(--gold)]'} mb-3 sm:mb-4`}>
                        {plan.subtitle}
                      </p>
                      <p className="text-[var(--fg-muted)] text-xs sm:text-sm mb-4 sm:mb-6 max-w-xs mx-auto">{plan.description}</p>

                      {/* Pricing */}
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-4xl sm:text-5xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)]">{plan.price}</span>
                        {plan.name === 'Free Forever' && (
                          <span className="text-[var(--fg-muted)] text-[0.6rem] sm:text-xs font-bold uppercase tracking-wider">/ FOREVER</span>
                        )}
                      </div>
                      <p className="text-[var(--fg-muted)] text-xs sm:text-sm font-bold uppercase tracking-wider">{plan.priceNote}</p>
                      <p className="text-[var(--primary)] text-[0.6rem] sm:text-xs font-bold uppercase tracking-widest mt-2">{plan.additionalCost}</p>
                    </div>

                    {/* Features */}
                    <div className="mb-6 sm:mb-10">
                      <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                        {plan.features.map((feature, featureIndex) => {
                          const FeatureIcon = feature.icon;
                          return (
                            <motion.div
                              key={featureIndex}
                              className="flex items-center gap-4 text-[var(--fg-muted)] group-hover:text-[var(--fg)] transition-colors text-sm"
                            >
                              <FeatureIcon className={`w-4 h-4 ${isPrimary ? 'text-[var(--primary)]' : 'text-[var(--gold)]'} flex-shrink-0`} />
                              <span className="uppercase tracking-wide font-bold text-xs">{feature.text}</span>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Perks */}
                      <div className="pt-6 border-t border-[var(--border-subtle)] text-center">
                        <div className="flex flex-wrap justify-center gap-3">
                          {plan.perks.map((perk, perkIndex) => (
                            <span
                              key={perkIndex}
                              className={`px-3 py-1 border ${isPrimary ? 'border-[var(--primary)]/30 text-[var(--primary)]' : 'border-[var(--gold)]/30 text-[var(--gold)]'} text-[10px] font-bold uppercase tracking-widest`}
                            >
                              {perk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Link href={plan.buttonLink} className="block mt-auto">
                      <button
                        className={`w-full py-4 px-6 border ${isPrimary ? 'bg-[var(--primary)] text-[var(--fg)] border-[var(--primary)] hover:bg-[var(--primary-light)]' : 'bg-transparent text-[var(--fg)] border-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)]'} font-bold uppercase tracking-widest text-xs transition-all duration-300 flex items-center justify-center gap-3 group/btn`}
                      >
                        {plan.buttonText}
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 relative z-10 border-t border-[var(--border-subtle)]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-10 sm:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-4 uppercase tracking-wide">
              Questions? <span className="text-[var(--primary)]">We&apos;ve got answers.</span>
            </h2>
          </motion.div>

          <div className="grid gap-4 sm:gap-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-8 relative hover:border-[var(--primary)] transition-colors duration-300"
              >
                 <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[var(--gold)]"></div>
                 <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[var(--gold)]"></div>
                 
                <h3 className="text-[var(--fg)] font-bold text-sm sm:text-lg mb-2 sm:mb-3 font-[family-name:var(--font-marcellus)] uppercase tracking-wide">{faq.question}</h3>
                <p className="text-[var(--fg-muted)] leading-relaxed text-xs sm:text-sm">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 relative z-10 border-t border-[var(--border-subtle)]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 sm:p-12 relative"
          >
             
             
             
             <div className="w-12 h-12 sm:w-16 sm:h-16 border border-[var(--primary)] rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-8 bg-[var(--bg)]">
               <Rocket className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--primary)]" />
             </div>
             
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-4 sm:mb-6 uppercase tracking-wide">
              Ready to launch something <span className="text-[var(--primary)]">amazing?</span>
            </h2>
            <p className="text-[var(--fg-muted)] text-sm sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto">
              Join thousands of organizers creating unforgettable events.
              <br />
              <span className="text-[var(--gold)] text-xs sm:text-sm font-bold uppercase tracking-widest mt-2 block">Start free. Grow unlimited.</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center">
              <Link href="/signup">
                <button
                  className="px-8 py-4 bg-[var(--primary)] text-[var(--fg)] border border-[var(--primary)] hover:bg-[var(--primary-light)] font-bold uppercase tracking-widest text-xs transition-all duration-300 shadow-[0_0_20px_var(--primary-glow)]"
                >
                  Start Building for Free
                </button>
              </Link>
              <Link href="/contact">
                <button className="px-8 py-4 bg-transparent text-[var(--fg)] border border-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)] font-bold uppercase tracking-widest text-xs transition-all duration-300">
                  Talk to an Expert
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
