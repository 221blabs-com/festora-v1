'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import { motion } from 'framer-motion';
import { AlertCircle, Plus, Trash2, Calendar, Users, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';

export function TicketsStep() {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
    control
  } = useFormContext();

  type TierError = {
    name?: { message?: string };
    price?: { message?: string };
    capacity?: { message?: string };
    description?: { message?: string };
    salesStart?: { message?: string };
    salesEnd?: { message?: string };
  };

  const tiersErrors = (errors?.tiers as unknown as TierError[] | undefined);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tiers'
  });

  const hasEarlyBird = watch('hasEarlyBird');
  const startDate = watch('startDate');

  const addTicketTier = () => {
    append({
      name: `Tier ${fields.length + 1}`,
      price: 0,
      capacity: 50,
      description: '',
      salesStart: new Date().toISOString().slice(0, 16),
      salesEnd: startDate ? new Date(new Date(startDate).getTime() - 2 * 60 * 60 * 1000).toISOString().slice(0, 16) : '',
    });
  };

  const removeTicketTier = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 sm:p-8 space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold mb-4 text-white">
          Ticket Configuration
        </h2>
        <p className="text-gray-400 mb-6">
          Set up your ticket tiers, pricing, and capacity. You can create multiple tiers with different prices and limits.
        </p>
      </div>

      {/* Early Bird Toggle */}
      <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/30 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-violet-300 mb-1">
              Early Bird Pricing
            </h4>
            <p className="text-sm text-gray-400">
              Enable special pricing for early registrations
            </p>
          </div>
          <button
            type="button"
            onClick={() => setValue('hasEarlyBird', !hasEarlyBird)}
            className="flex items-center"
          >
            {hasEarlyBird ? (
              <ToggleRight className="w-8 h-8 text-violet-400" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Ticket Tiers */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Ticket Tiers
          </h3>
          <button
            type="button"
            onClick={addTicketTier}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Add Tier
          </button>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white">
                Tier {index + 1}
              </h4>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTicketTier(index)}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tier Name */}
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-300">
                  Tier Name *
                </label>
                <input
                  type="text"
                  {...register(`tiers.${index}.name`)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white placeholder-gray-400 transition-all"
                  placeholder="e.g., General, VIP, Student"
                />
                {tiersErrors?.[index]?.name && (
                  <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {tiersErrors?.[index]?.name?.message as string}
                  </p>
                )}
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-300">
                  Price (₹) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    {...register(`tiers.${index}.price`, { valueAsNumber: true })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white placeholder-gray-400 transition-all"
                    placeholder="0.00"
                  />
                </div>
                {tiersErrors?.[index]?.price && (
                  <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {tiersErrors?.[index]?.price?.message as string}
                  </p>
                )}
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-300">
                  Capacity *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    min="1"
                    {...register(`tiers.${index}.capacity`, { valueAsNumber: true })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white placeholder-gray-400 transition-all"
                    placeholder="100"
                  />
                </div>
                {tiersErrors?.[index]?.capacity && (
                  <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {tiersErrors?.[index]?.capacity?.message as string}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-300">
                  Description
                </label>
                <input
                  type="text"
                  {...register(`tiers.${index}.description`)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white placeholder-gray-400 transition-all"
                  placeholder="Brief description of this tier"
                />
              </div>
            </div>

            {/* Sales Period */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-300">
                  Sales Start *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="datetime-local"
                    {...register(`tiers.${index}.salesStart`)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white placeholder-gray-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3 text-gray-300">
                  Sales End *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="datetime-local"
                    {...register(`tiers.${index}.salesEnd`)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white placeholder-gray-400 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Validation Tips */}
      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-6 backdrop-blur-sm">
        <h4 className="font-semibold text-amber-300 mb-3">
          💡 Pricing Tips
        </h4>
        <ul className="text-sm text-gray-300 space-y-2">
          <li>• Set sales end time at least 2 hours before event start</li>
          <li>• Consider offering student discounts or group rates</li>
          <li>• Free events can help build your audience</li>
          <li>• Early bird pricing encourages early registration</li>
        </ul>
      </div>
    </motion.div>
  );
}
