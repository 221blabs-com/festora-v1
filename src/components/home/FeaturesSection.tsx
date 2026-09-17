'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Ticket, BarChart3, QrCode, ShieldCheck, Paintbrush, Globe } from 'lucide-react';

const features = [
	{
		icon: <Ticket className="w-8 h-8 text-[var(--gold)]" />,
		title: 'Easy Ticketing',
		description:
			'Create and sell tickets in minutes. Customize types, pricing, and availability with ease.',
	},
	{
		icon: <BarChart3 className="w-8 h-8 text-[var(--gold)]" />,
		title: 'Real-time Analytics',
		description: 'Track sales, attendance, and revenue as they happen. Make data-driven decisions.',
	},
	{
		icon: <QrCode className="w-8 h-8 text-[var(--gold)]" />,
		title: 'QR Code Check-ins',
		description: 'Scanning app integration for seamless entry management at your venue.',
	},
	{
		icon: <ShieldCheck className="w-8 h-8 text-[var(--gold)]" />,
		title: 'Secure Payments',
		description:
			'Integrated with trusted payment gateways. Ensuring safe transactions for you and your attendees.',
	},
	{
		icon: <Paintbrush className="w-8 h-8 text-[var(--gold)]" />,
		title: 'Custom Branding',
		description: 'Design your event pages to match your brand identity. Fully customizable templates.',
	},
	{
		icon: <Globe className="w-8 h-8 text-[var(--gold)]" />,
		title: 'Global Reach',
		description: 'Host events anywhere. Support for multiple currencies and languages.',
	},
];

const FeaturesSection = () => {
    const [isExpanded, setIsExpanded] = useState(false);

	return (
		<section className="py-14 sm:py-20 md:py-24 bg-[var(--bg)] relative overflow-hidden">
			{/* Background Decor */}
			<div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-30" />
			<div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-30" />

			{/* Ambient Light Orbs */}
			<div className="absolute top-1/4 -left-20 w-40 sm:w-64 h-40 sm:h-64 bg-[var(--primary)]/5 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none" />
			<div className="absolute bottom-1/4 -right-20 w-40 sm:w-64 h-40 sm:h-64 bg-[var(--gold)]/5 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none" />

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
				<div className="text-center mb-10 sm:mb-12 md:mb-16">
					<motion.h2
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 font-[family-name:var(--font-marcellus)] text-[var(--fg)]"
					>
						Powerful Features
					</motion.h2>
					<motion.div
						initial={{ opacity: 0, width: 0 }}
						whileInView={{ opacity: 1, width: 80 }}
						viewport={{ once: true }}
						transition={{ delay: 0.2, duration: 0.8 }}
						className="h-0.5 sm:h-1 bg-[var(--primary)] mx-auto mb-3 sm:mb-4 md:mb-6"
					/>
					<motion.p
						initial={{ opacity: 0, y: 10 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: 0.3 }}
						className="text-[var(--fg-muted)] max-w-2xl mx-auto text-sm sm:text-base md:text-lg font-light px-2"
					>
						Everything you need to host successful events, from planning to post-event analysis.
					</motion.p>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 md:gap-8">
					{features.map((feature, index) => {
					    const isHiddenOnMobile = !isExpanded && index >= 3;
					    return (
						<motion.div
							key={index}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: index * 0.08 }}
							className={`group relative bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 sm:p-6 md:p-8 corner-bracket transition-all duration-300 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[var(--gold)]/5 ${isHiddenOnMobile ? 'hidden sm:block' : ''}`}
						>
							<div className="absolute inset-0 bg-gradient-to-br from-[var(--gold)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

							<div className="flex flex-row sm:flex-col items-start gap-3 sm:gap-0">
								<div className="relative z-10 flex-shrink-0 sm:mb-5 md:mb-6 bg-[var(--bg)] w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center rounded-lg sm:rounded-xl md:rounded-2xl border border-[var(--border-subtle)] group-hover:border-[var(--gold)]/50 group-hover:bg-[var(--gold)]/10 transition-all duration-300">
                                                                        <div className="transition-transform duration-300 group-hover:scale-110">
                                                                                {React.cloneElement(feature.icon as React.ReactElement<any>, {
                                                                                        className: 'w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[var(--gold)]',
                                                                                })}
                                                                        </div>
								</div>

								<div className="flex-1 min-w-0 pt-0.5 sm:pt-0">
									<h3 className="relative z-10 text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2 md:mb-3 font-[family-name:var(--font-marcellus)] text-[var(--fg)] group-hover:text-[var(--gold)] transition-colors">
										{feature.title}
									</h3>
									<p className="relative z-10 text-[var(--fg-muted)] leading-relaxed text-xs sm:text-sm">
										{feature.description}
									</p>
								</div>
							</div>
						</motion.div>
					)})}
				</div>

                {/* Mobile Expand Toggle */}
                {features.length > 3 && (
                    <div className="mt-8 flex justify-center sm:hidden">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-xs font-bold uppercase tracking-wider text-[var(--fg)] border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-xl px-8 py-3 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all shadow-sm"
                        >
                            {isExpanded ? 'View Less' : 'Explore All Features'}
                        </button>
                    </div>
                )}
			</div>
		</section>
	);
};

export default FeaturesSection;
